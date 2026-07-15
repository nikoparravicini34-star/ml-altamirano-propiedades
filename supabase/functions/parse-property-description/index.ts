import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROPERTY_TYPES = ['Casa', 'Departamento', 'Lote', 'PH', 'Oficina', 'Local', 'Quinta', 'Campo'];
const CURRENCIES = ['USD', 'ARS'];
const OPERATIONS = ['venta', 'alquiler'];
const STATUSES = ['disponible', 'reservada', 'vendida', 'alquilada'];

const SYSTEM_PROMPT = `Sos un asistente inmobiliario para Altamirano Propiedades (Argentina).
Extraé datos estructurados de descripciones libres de propiedades.

Reglas:
- Respondé SOLO con JSON válido, sin markdown ni texto extra.
- Omití campos que no puedas inferir con confianza (no uses null).
- property_type debe ser uno de: ${PROPERTY_TYPES.join(', ')}.
- currency debe ser USD o ARS.
- operation debe ser "venta" o "alquiler".
- status debe ser uno de: ${STATUSES.join(', ')} (default "disponible" si no se menciona).
- amenities = servicios (pileta, sum, seguridad, etc.).
- features = características físicas (aire acondicionado, parrilla, etc.).
- price debe ser numérico sin símbolos.
- short_description: 1-2 oraciones; full_description: texto más completo si hay material.
- province/country: inferí Buenos Aires / Argentina si aplica la zona norte GBA.`;

/** OpenAPI Schema subset for structured JSON extraction (no additionalProperties/enum). */
const JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    price: { type: 'number' },
    currency: { type: 'string', description: `Moneda: ${CURRENCIES.join(' o ')}` },
    operation: { type: 'string', description: `Operación: ${OPERATIONS.join(' o ')}` },
    property_type: { type: 'string', description: `Tipo: ${PROPERTY_TYPES.join(', ')}` },
    city: { type: 'string' },
    neighborhood: { type: 'string' },
    province: { type: 'string' },
    country: { type: 'string' },
    bedrooms: { type: 'integer' },
    bathrooms: { type: 'integer' },
    garages: { type: 'integer' },
    covered_area: { type: 'number' },
    total_area: { type: 'number' },
    age_years: { type: 'integer' },
    amenities: { type: 'array', items: { type: 'string' } },
    features: { type: 'array', items: { type: 'string' } },
    short_description: { type: 'string' },
    full_description: { type: 'string' },
    status: { type: 'string', description: `Estado: ${STATUSES.join(', ')}` },
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requireStaff(authHeader: string | null): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, message: 'Sesión requerida.' };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, message: 'Configuración del servidor incompleta.' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, status: 401, message: 'Sesión inválida o expirada.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, is_blocked')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, status: 403, message: 'Perfil de usuario no encontrado.' };
  }

  if (profile.is_blocked) {
    return { ok: false, status: 403, message: 'Tu cuenta está bloqueada.' };
  }

  const staffRoles = ['super_admin', 'admin', 'editor', 'agent'];
  if (!staffRoles.includes(profile.role)) {
    return { ok: false, status: 403, message: 'No tenés permisos para usar el asistente IA.' };
  }

  return { ok: true };
}

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = 120_000;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function buildGroqMessages(description: string): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}

Esquema JSON esperado (solo incluir campos inferidos con confianza):
${JSON.stringify(JSON_SCHEMA.properties, null, 2)}`,
    },
    {
      role: 'user',
      content: `Descripción de la propiedad:
${description}`,
    },
  ];
}

async function callGroq(description: string): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey?.trim()) {
    throw new Error('GROQ_API_KEY no configurada en Supabase Edge Functions.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: buildGroqMessages(description),
          response_format: { type: 'json_object' },
          temperature: 0,
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al consultar el servicio de IA.');
      }
      console.error('[parse-property-description] Groq fetch error:', fetchErr);
      throw new Error('No se pudo conectar con el servicio de IA (Groq).');
    }

    if (!response.ok) {
      const errorText = await response.text();

      console.error('Groq HTTP status:', response.status);
      console.error('Groq response:', errorText);

      throw new Error('El servicio de IA no respondió correctamente.');
    }

    let payload: {
      choices?: Array<{ message?: { content?: string } }>;
    };
    try {
      payload = await response.json();
    } catch (parseErr) {
      console.error('[parse-property-description] Groq invalid HTTP JSON:', parseErr);
      throw new Error('Respuesta inválida del servicio de IA.');
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Respuesta vacía del servicio de IA.');
    }

    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch (jsonErr) {
      console.error('[parse-property-description] Groq invalid content JSON:', jsonErr, content);
      throw new Error('El servicio de IA devolvió JSON inválido.');
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

function sanitizeParsed(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  const stringFields = [
    'title', 'currency', 'operation', 'property_type', 'city', 'neighborhood',
    'province', 'country', 'short_description', 'full_description', 'status',
  ] as const;

  for (const key of stringFields) {
    const val = raw[key];
    if (typeof val === 'string' && val.trim()) out[key] = val.trim();
  }

  const intFields = ['bedrooms', 'bathrooms', 'garages', 'age_years'] as const;
  for (const key of intFields) {
    const val = raw[key];
    if (typeof val === 'number' && Number.isFinite(val)) out[key] = Math.round(val);
  }

  const floatFields = ['price', 'covered_area', 'total_area'] as const;
  for (const key of floatFields) {
    const val = raw[key];
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) out[key] = val;
  }

  for (const key of ['amenities', 'features'] as const) {
    const val = raw[key];
    if (Array.isArray(val)) {
      const items = val
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length) out[key] = items;
    }
  }

  if (typeof out.currency === 'string' && !CURRENCIES.includes(out.currency as string)) {
    delete out.currency;
  }
  if (typeof out.operation === 'string' && !OPERATIONS.includes(out.operation as string)) {
    delete out.operation;
  }
  if (typeof out.property_type === 'string' && !PROPERTY_TYPES.includes(out.property_type as string)) {
    delete out.property_type;
  }
  if (typeof out.status === 'string' && !STATUSES.includes(out.status as string)) {
    delete out.status;
  }

  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  try {
    const auth = await requireStaff(req.headers.get('Authorization'));
    if (!auth.ok) {
      return jsonResponse({ error: auth.message }, auth.status);
    }

    const body = await req.json().catch(() => null) as { description?: string } | null;
    const description = body?.description?.trim();
    if (!description) {
      return jsonResponse({ error: 'La descripción es obligatoria.' }, 400);
    }

    if (description.length > 8000) {
      return jsonResponse({ error: 'La descripción es demasiado larga (máx. 8000 caracteres).' }, 400);
    }

    const raw = await callGroq(description);
    const data = sanitizeParsed(raw);

    if (Object.keys(data).length === 0) {
      return jsonResponse({ error: 'No se pudieron extraer datos de la descripción.' }, 422);
    }

    return jsonResponse({ data });
  } catch (err) {
    console.error('[parse-property-description]', err);
    const message = err instanceof Error ? err.message : 'Error interno del servidor.';
    return jsonResponse({ error: message }, 500);
  }
});
