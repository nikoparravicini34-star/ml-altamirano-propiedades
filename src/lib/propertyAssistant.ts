import type { Property } from '../types';

const UNAVAILABLE =
  'Esa información no está disponible en la publicación de esta propiedad.';

/** Internal / technical keys that should never be exposed as answers */
const SKIP_KEYS = new Set([
  'id',
  'photos',
  'videos',
  'video_url',
  'latitude',
  'longitude',
  'featured',
  'published',
  'created_at',
  'updated_at',
]);

const FIELD_LABELS: Record<string, string> = {
  title: 'título',
  price: 'precio',
  currency: 'moneda',
  operation: 'operación',
  property_type: 'tipo de propiedad',
  city: 'ciudad',
  neighborhood: 'barrio',
  province: 'provincia',
  country: 'país',
  bedrooms: 'dormitorios',
  bathrooms: 'baños',
  garages: 'cocheras',
  covered_area: 'superficie cubierta',
  total_area: 'superficie total',
  age_years: 'antigüedad',
  amenities: 'amenities',
  features: 'características',
  short_description: 'descripción breve',
  full_description: 'descripción',
  status: 'estado',
  expenses: 'expensas',
  orientation: 'orientación',
  year_built: 'año de construcción',
  floor: 'piso',
  rooms: 'ambientes',
};

/** Question patterns → property field keys (and optional amenity search terms) */
interface Intent {
  keys: string[];
  patterns: RegExp[];
  /** Extra terms to look for in description / amenities / features */
  searchTerms?: string[];
  formatter?: (property: Property, values: Record<string, unknown>) => string | null;
}

const INTENTS: Intent[] = [
  {
    keys: ['bathrooms'],
    patterns: [
      /\bbañ[oa]s?\b/i,
      /\btoilet(?:te)?s?\b/i,
      /\bbathrooms?\b/i,
      /\bwc\b/i,
    ],
    formatter: (p) => {
      if (p.bathrooms == null) return null;
      return p.bathrooms === 1
        ? 'Esta propiedad tiene 1 baño.'
        : `Esta propiedad tiene ${p.bathrooms} baños.`;
    },
  },
  {
    keys: ['bedrooms'],
    patterns: [
      /\bdormitorios?\b/i,
      /\bhabitaciones?\b/i,
      /\bcuartos?\b/i,
      /\bbedrooms?\b/i,
      /\bambientes?\b/i,
    ],
    formatter: (p) => {
      if (p.bedrooms == null) return null;
      return p.bedrooms === 1
        ? 'Esta propiedad tiene 1 dormitorio.'
        : `Esta propiedad tiene ${p.bedrooms} dormitorios.`;
    },
  },
  {
    keys: ['total_area', 'covered_area'],
    patterns: [
      /\bsuperficie(?:\s+del)?\s+terreno\b/i,
      /\bmetros?\s*(?:cuadrados?|m2|m²)?\s*(?:totales?|del\s+terreno)?\b/i,
      /\bterreno\b/i,
      /\btotal[_\s]?area\b/i,
      /\bm2\s*totales?\b/i,
    ],
    formatter: (p) => {
      if (p.total_area != null && p.total_area > 0) {
        return `La superficie total del terreno es de ${formatNumber(p.total_area)} m².`;
      }
      return null;
    },
  },
  {
    keys: ['covered_area'],
    patterns: [
      /\bcubiert[oa]s?\b/i,
      /\bsuperficie\s+cubierta\b/i,
      /\bmetros?\s*(?:cuadrados?|m2|m²)?\s*cubiert/i,
      /\bm2\s*cubiert/i,
      /\bcovered[_\s]?area\b/i,
    ],
    formatter: (p) => {
      if (p.covered_area != null && p.covered_area > 0) {
        return `La superficie cubierta es de ${formatNumber(p.covered_area)} m².`;
      }
      return null;
    },
  },
  {
    keys: ['neighborhood', 'city', 'province', 'country'],
    patterns: [
      /\bubicad[oa]\b/i,
      /\bubicaci[oó]n\b/i,
      /\bd[oó]nde\s+(?:est[aá]|queda|se\s+encuentra)\b/i,
      /\bbarrio\b/i,
      /\bciudad\b/i,
      /\blocalidad\b/i,
      /\bprovincia\b/i,
      /\bdirecci[oó]n\b/i,
    ],
    formatter: (p) => {
      const parts = [p.neighborhood, p.city, p.province, p.country].filter(Boolean);
      if (parts.length === 0) return null;
      return `Esta propiedad se encuentra en ${parts.join(', ')}.`;
    },
  },
  {
    keys: ['garages'],
    patterns: [
      /\bcocheras?\b/i,
      /\bgarages?\b/i,
      /\bestacionamiento\b/i,
      /\bparking\b/i,
    ],
    searchTerms: ['cochera', 'garage', 'estacionamiento', 'parking'],
    formatter: (p) => {
      if (p.garages != null) {
        if (p.garages === 0) return 'Según la publicación, esta propiedad no tiene cochera.';
        return p.garages === 1
          ? 'Sí, esta propiedad tiene 1 cochera.'
          : `Sí, esta propiedad tiene ${p.garages} cocheras.`;
      }
      return null;
    },
  },
  {
    keys: [],
    patterns: [/\bpileta\b/i, /\bpiscina\b/i, /\bpool\b/i],
    searchTerms: ['pileta', 'piscina', 'pool'],
  },
  {
    keys: [],
    patterns: [/\bmascotas?\b/i, /\bpet[s]?\b/i, /\bperros?\b/i, /\bgatos?\b/i],
    searchTerms: ['mascota', 'mascotas', 'pet friendly', 'pet-friendly', 'acepta mascotas'],
  },
  {
    keys: [],
    patterns: [
      /\bcr[eé]dito\b/i,
      /\bhipotecario\b/i,
      /\bapto\s+cr[eé]dito\b/i,
      /\bbanco\b/i,
    ],
    searchTerms: ['crédito', 'credito', 'apto crédito', 'apto credito', 'hipotecario'],
  },
  {
    keys: [],
    patterns: [
      /\bcolegios?\b/i,
      /\bescuelas?\b/i,
      /\beducaci[oó]n\b/i,
      /\buniversidad(?:es)?\b/i,
    ],
    searchTerms: ['colegio', 'colegios', 'escuela', 'escuelas', 'universidad', 'educación'],
  },
  {
    keys: ['amenities', 'features'],
    patterns: [
      /\bservicios?\b/i,
      /\bamenities?\b/i,
      /\bcomodidades?\b/i,
      /\bincluye\b/i,
      /\bqu[eé]\s+tiene\b/i,
    ],
  },
  {
    keys: [],
    patterns: [
      /\bseguridad\b/i,
      /\bvigilancia\b/i,
      /\bporter[oa]\b/i,
      /\balarma\b/i,
      /\bc[aá]maras?\b/i,
    ],
    searchTerms: ['seguridad', 'vigilancia', 'portero', 'alarma', 'cámaras', 'camaras', 'barrio cerrado', 'country'],
  },
  {
    keys: ['price', 'currency', 'operation'],
    patterns: [
      /\bprecios?\b/i,
      /\bcu[aá]nto\s+(?:cuesta|vale|sale)\b/i,
      /\bvalor\b/i,
      /\bcosto\b/i,
      /\bprice\b/i,
    ],
    formatter: (p) => {
      if (p.price == null) return null;
      const formatted = new Intl.NumberFormat('es-AR').format(p.price);
      const suffix = p.operation === 'alquiler' ? ' por mes' : '';
      return `El precio publicado es de ${p.currency} ${formatted}${suffix}.`;
    },
  },
  {
    keys: ['operation', 'status'],
    patterns: [
      /\bventa\b/i,
      /\balquiler\b/i,
      /\bdisponible\b/i,
      /\best[aá]\s+(?:en\s+)?venta\b/i,
      /\best[aá]\s+(?:en\s+)?alquiler\b/i,
      /\boperaci[oó]n\b/i,
      /\bestado\b/i,
    ],
    formatter: (p) => {
      const op = p.operation === 'venta' ? 'venta' : 'alquiler';
      const statusLabel: Record<string, string> = {
        disponible: 'disponible',
        reservada: 'reservada',
        vendida: 'vendida',
        alquilada: 'alquilada',
      };
      const st = statusLabel[p.status] ?? p.status;
      return `Esta propiedad está publicada para ${op} y su estado actual es: ${st}.`;
    },
  },
  {
    keys: ['property_type'],
    patterns: [/\btipo\b/i, /\bqu[eé]\s+tipo\b/i, /\bcasa\b/i, /\bdepartamento\b/i, /\bph\b/i],
    formatter: (p) => {
      if (!p.property_type) return null;
      return `Se trata de un/a ${p.property_type.toLowerCase()}.`;
    },
  },
  {
    keys: ['age_years', 'year_built'],
    patterns: [
      /\bantig[uü]edad\b/i,
      /\ba[nñ]os?\s+de\s+(?:antig[uü]edad|construcci[oó]n)\b/i,
      /\ba[nñ]o\s+de\s+construcci[oó]n\b/i,
      /\bcu[aá]ndo\s+se\s+construy[oó]\b/i,
    ],
    formatter: (p) => {
      const age = (p as Property & { year_built?: number | null }).age_years;
      const year = (p as Property & { year_built?: number | null }).year_built;
      if (age != null) {
        return age === 0
          ? 'Según la publicación, es una propiedad a estrenar (0 años de antigüedad).'
          : `La antigüedad publicada es de ${age} años.`;
      }
      if (year != null) return `El año de construcción indicado es ${year}.`;
      return null;
    },
  },
  {
    keys: ['title'],
    patterns: [/\bt[ií]tulo\b/i, /\bc[oó]mo\s+se\s+llama\b/i, /\bnombre\b/i],
    formatter: (p) => (p.title ? `La publicación se titula: "${p.title}".` : null),
  },
];

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-AR').format(n);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function humanizeKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key.replace(/_/g, ' ');
}

function formatValue(key: string, value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'sí' : 'no';
  if (key === 'price' && typeof value === 'number') {
    return new Intl.NumberFormat('es-AR').format(value);
  }
  if ((key === 'covered_area' || key === 'total_area') && typeof value === 'number') {
    return `${formatNumber(value)} m²`;
  }
  if (key === 'operation') return String(value);
  return String(value);
}

/** Build a searchable corpus from every non-technical field (future-proof). */
export function buildPropertyKnowledge(property: Property): {
  facts: { key: string; label: string; value: unknown; text: string }[];
  searchableText: string;
} {
  const record = property as unknown as Record<string, unknown>;
  const facts: { key: string; label: string; value: unknown; text: string }[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (SKIP_KEYS.has(key) || isEmpty(value)) continue;
    const label = humanizeKey(key);
    const formatted = formatValue(key, value);
    facts.push({
      key,
      label,
      value,
      text: `${label}: ${formatted}`,
    });
  }

  const searchableText = normalize(
    facts.map((f) => f.text).join('\n') +
      '\n' +
      (property.full_description ?? '') +
      '\n' +
      (property.short_description ?? '') +
      '\n' +
      (property.amenities ?? []).join(' ') +
      '\n' +
      (property.features ?? []).join(' ')
  );

  return { facts, searchableText };
}

function findInText(searchable: string, terms: string[]): string | null {
  for (const term of terms) {
    const n = normalize(term);
    if (searchable.includes(n)) {
      return term;
    }
  }
  return null;
}

function extractSnippet(property: Property, term: string): string | null {
  const blobs = [
    property.full_description,
    property.short_description,
    ...(property.amenities ?? []),
    ...(property.features ?? []),
  ].filter(Boolean) as string[];

  const nTerm = normalize(term);
  for (const blob of blobs) {
    const nBlob = normalize(blob);
    const idx = nBlob.indexOf(nTerm);
    if (idx === -1) continue;
    // Return the amenity/feature line if short, or a short context from description
    if (blob.length < 80) return blob;
    const start = Math.max(0, idx - 40);
    const end = Math.min(blob.length, idx + term.length + 60);
    let snippet = blob.slice(start, end).trim();
    if (start > 0) snippet = '…' + snippet;
    if (end < blob.length) snippet = snippet + '…';
    return snippet;
  }
  return null;
}

function answerAmenitiesList(property: Property): string | null {
  const items = [
    ...(property.amenities ?? []),
    ...(property.features ?? []),
  ].filter(Boolean);

  if (items.length === 0) return null;
  return `Según la publicación, esta propiedad incluye: ${items.join(', ')}.`;
}

function matchDynamicField(
  question: string,
  facts: { key: string; label: string; value: unknown; text: string }[]
): string | null {
  const q = normalize(question);

  for (const fact of facts) {
    const labelNorm = normalize(fact.label);
    const keyNorm = normalize(fact.key.replace(/_/g, ' '));
    if (q.includes(labelNorm) || q.includes(keyNorm)) {
      return `Según la publicación, ${fact.label}: ${formatValue(fact.key, fact.value)}.`;
    }
  }
  return null;
}

/**
 * Answers a natural-language question using only the given property's data.
 * Never invents facts. Automatically uses any fields present on the property object.
 */
export function answerPropertyQuestion(property: Property, question: string): string {
  const trimmed = question.trim();
  if (!trimmed) {
    return 'Escribí una pregunta sobre esta propiedad y te respondo con la información de la publicación.';
  }

  const { facts, searchableText } = buildPropertyKnowledge(property);
  const q = normalize(trimmed);

  // Greeting / meta
  if (/^(hola|buenas|hey|hi)\b/.test(q) || /qui[eé]n eres|qu[eé] pod[eé]s/.test(q)) {
    return `Soy el asistente de esta publicación. Puedo responderte sobre "${property.title}" usando únicamente los datos publicados. ¿Qué te gustaría saber?`;
  }

  for (const intent of INTENTS) {
    if (!intent.patterns.some((p) => p.test(trimmed))) continue;

    if (intent.formatter) {
      const answer = intent.formatter(property, Object.fromEntries(facts.map((f) => [f.key, f.value])));
      if (answer) return answer;
    }

    // Services / amenities list
    if (intent.keys.includes('amenities') || intent.keys.includes('features')) {
      const list = answerAmenitiesList(property);
      if (list) return list;
    }

    // Search description / amenities for amenity-style questions
    if (intent.searchTerms?.length) {
      const found = findInText(searchableText, intent.searchTerms);
      if (found) {
        const snippet = extractSnippet(property, found);
        if (snippet && snippet.length > found.length + 5) {
          return `Sí, la publicación menciona: "${snippet}".`;
        }
        return `Sí, la publicación menciona "${found}" entre la información de esta propiedad.`;
      }
      // Explicit negative only when we looked for a yes/no amenity and it's not mentioned
      if (
        intent.searchTerms.some((t) =>
          ['pileta', 'piscina', 'mascota', 'crédito', 'credito', 'colegio', 'seguridad'].some((k) =>
            normalize(t).includes(k)
          )
        )
      ) {
        return UNAVAILABLE;
      }
    }

    // Structured keys present but empty
    if (intent.keys.length > 0) {
      const hasAny = intent.keys.some((k) => {
        const v = (property as unknown as Record<string, unknown>)[k];
        return !isEmpty(v);
      });
      if (!hasAny) return UNAVAILABLE;
    }
  }

  // Future fields: match question words to any fact label/key
  const dynamic = matchDynamicField(trimmed, facts);
  if (dynamic) return dynamic;

  // Soft search: if question words appear in description, quote a relevant bit
  const words = q
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 6);

  for (const word of words) {
    if (searchableText.includes(word)) {
      const snippet = extractSnippet(property, word);
      if (snippet) {
        return `Según la publicación: "${snippet}". Si necesitás más detalle sobre un dato concreto (precio, metros, ubicación), preguntame de forma más específica.`;
      }
    }
  }

  return UNAVAILABLE;
}

export const SUGGESTED_QUESTIONS = [
  '¿Cuántos dormitorios tiene?',
  '¿Cuántos baños tiene?',
  '¿Cuál es el precio?',
  '¿Dónde está ubicada?',
  '¿Tiene cochera?',
  '¿Cuál es la superficie cubierta?',
];
