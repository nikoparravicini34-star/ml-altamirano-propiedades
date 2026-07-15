/**
 * Applies Supabase migrations and creates storage buckets.
 *
 * Required in .env:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (Dashboard → Settings → API Keys → Secret key, sb_secret_...)
 *
 * Required for SQL migrations:
 *   SUPABASE_DB_URL  (Dashboard → Settings → Database → Connection string → URI)
 *
 * Run: npm run setup:db
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const i = trimmed.indexOf('=');
      if (i === -1) continue;
      const key = trimmed.slice(0, i).trim();
      const val = trimmed.slice(i + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* no .env */
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;

if (!url) {
  console.error('Falta VITE_SUPABASE_URL en .env');
  process.exit(1);
}

const migrationsDir = join(root, 'supabase', 'migrations');
const migrationFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log('Migraciones SQL encontradas:', migrationFiles.length);

if (!serviceKey && !dbUrl) {
  console.log('\n⚠  Configurá SUPABASE_SERVICE_ROLE_KEY y SUPABASE_DB_URL en .env');
  console.log('   Luego ejecutá: npm run setup:db\n');
  process.exit(0);
}

function isOpaqueSecretKey(key) {
  return key.startsWith('sb_secret_');
}

function adminHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

async function validateServiceKey(key) {
  const res = await fetch(`${url}/rest/v1/`, { headers: adminHeaders(key) });
  if (res.status === 401) return false;
  return res.ok || res.status === 404 || res.status === 200;
}

async function storageRequest(method, path, key, body) {
  const res = await fetch(`${url}/storage/v1${path}`, {
    method,
    headers: adminHeaders(key, body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text };
  }
  return { ok: res.ok, status: res.status, data: json };
}

const BUCKETS = [
  {
    id: 'property-images',
    name: 'property-images',
    public: true,
    file_size_limit: null,
    allowed_mime_types: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'image/heic', 'image/heif', 'image/avif', 'image/tiff',
    ],
  },
  {
    id: 'property-videos',
    name: 'property-videos',
    public: true,
    file_size_limit: null,
    allowed_mime_types: [
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      'video/x-m4v', 'video/x-matroska', 'video/ogg', 'application/octet-stream',
    ],
  },
  {
    id: 'site-assets',
    name: 'site-assets',
    public: true,
    file_size_limit: null,
    allowed_mime_types: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'image/x-icon', 'image/vnd.microsoft.icon',
      'image/heic', 'image/heif', 'image/avif', 'image/tiff',
    ],
  },
  {
    id: 'avatars',
    name: 'avatars',
    public: true,
    file_size_limit: 2 * 1024 * 1024,
    allowed_mime_types: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'image/heic', 'image/heif', 'image/avif',
    ],
  },
];

async function ensureBucketsViaApi(key) {
  console.log('\n── Storage buckets ──');
  for (const bucket of BUCKETS) {
    const payload = {
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      file_size_limit: bucket.file_size_limit,
      allowed_mime_types: bucket.allowed_mime_types,
    };

    const created = await storageRequest('POST', '/bucket', key, payload);
    if (created.ok) {
      console.log(`✓ Bucket "${bucket.id}" creado`);
      continue;
    }

    const msg = (created.data?.message ?? created.data?.error ?? '').toLowerCase();
    if (msg.includes('already exists') || msg.includes('duplicate') || created.status === 409) {
      const updated = await storageRequest('PUT', `/bucket/${bucket.id}`, key, {
        public: bucket.public,
        file_size_limit: bucket.file_size_limit,
        allowed_mime_types: bucket.allowed_mime_types,
      });
      if (updated.ok) {
        console.log(`✓ Bucket "${bucket.id}" actualizado`);
      } else {
        console.warn(`⚠ Bucket "${bucket.id}" existe pero no se pudo actualizar:`, updated.data?.message ?? updated.status);
      }
    } else {
      console.warn(`⚠ Bucket "${bucket.id}":`, created.data?.message ?? created.data?.error ?? created.status);
    }
  }
}

async function runSqlViaPostgres(sql) {
  const { default: postgres } = await import('postgres');
  const sqlClient = postgres(dbUrl, { ssl: 'require', max: 1 });
  try {
    await sqlClient.unsafe(sql);
    return true;
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

async function applyMigrations() {
  console.log('\n── SQL migrations ──');
  if (!dbUrl) {
    console.warn('⚠  Falta SUPABASE_DB_URL en .env — no se pueden aplicar migraciones automáticamente.');
    console.warn('   Agregá la URI de conexión desde Supabase Dashboard → Settings → Database.');
    console.warn('   O ejecutá manualmente los archivos en supabase/migrations/ en el SQL Editor.\n');
    return;
  }

  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    process.stdout.write(`Aplicando ${file}... `);
    try {
      await runSqlViaPostgres(sql);
      console.log('✓');
    } catch (err) {
      console.log('✗');
      console.warn(`   Error en ${file}:`, err instanceof Error ? err.message : err);
    }
  }
}

async function verifySetup(key) {
  console.log('\n── Verificación ──');

  const bucketsRes = await storageRequest('GET', '/bucket', key);
  if (!bucketsRes.ok) {
    console.warn('No se pudo listar buckets:', bucketsRes.data?.message ?? bucketsRes.status);
  } else {
    const ids = new Set((bucketsRes.data ?? []).map((b) => b.id ?? b.name));
    for (const bucket of BUCKETS) {
      console.log(ids.has(bucket.id) ? `✓ ${bucket.id}` : `✗ ${bucket.id} (falta)`);
    }
  }

  const settingsRes = await fetch(`${url}/rest/v1/site_settings?select=id&limit=1`, {
    headers: adminHeaders(key),
  });
  const settingsText = await settingsRes.text();
  if (settingsRes.ok) {
    console.log('✓ site_settings');
  } else if (settingsText.includes('PGRST205')) {
    console.log('✗ site_settings (tabla no existe — aplicá las migraciones SQL)');
  } else {
    console.log(`✗ site_settings (${settingsText.slice(0, 80)})`);
  }

  const propsRes = await fetch(`${url}/rest/v1/properties?select=videos,published&limit=1`, {
    headers: adminHeaders(key),
  });
  const propsText = await propsRes.text();
  if (propsRes.ok) {
    console.log('✓ properties (columnas published, videos)');
  } else if (propsText.includes('42703')) {
    console.log('✗ properties (faltan columnas published/videos — aplicá las migraciones SQL)');
  } else {
    console.log(`✗ properties (${propsText.slice(0, 80)})`);
  }
}

async function testUpload(key) {
  console.log('\n── Prueba de subida ──');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const path = `setup-test/${Date.now()}.png`;
  const res = await fetch(`${url}/storage/v1/object/property-images/${path}`, {
    method: 'POST',
    headers: {
      ...adminHeaders(key),
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: png,
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn('✗ No se pudo subir imagen de prueba:', err.slice(0, 120));
    return;
  }
  const publicUrl = `${url}/storage/v1/object/public/property-images/${path}`;
  const getRes = await fetch(publicUrl);
  console.log(getRes.ok ? `✓ Subida y lectura pública OK (${publicUrl})` : '✗ Archivo subido pero no accesible públicamente');
}

if (serviceKey) {
  const keyType = isOpaqueSecretKey(serviceKey) ? 'sb_secret (nueva)' : 'service_role JWT (legacy)';
  console.log(`\nClave de servicio detectada: ${keyType}`);

  const valid = await validateServiceKey(serviceKey);
  if (!valid) {
    console.error('\n✗ SUPABASE_SERVICE_ROLE_KEY no es válida (Supabase respondió 401).');
    console.error('  Copiá la Secret key completa desde:');
    console.error('  Supabase Dashboard → Settings → API Keys → Secret keys → Reveal / Copy');
    console.error('  Debe empezar con sb_secret_ y pegarse sin espacios ni comillas.\n');
    process.exit(1);
  }
  console.log('✓ Conexión con Supabase verificada');

  await applyMigrations();
  await ensureBucketsViaApi(serviceKey);
  await verifySetup(serviceKey);
  await testUpload(serviceKey);
} else {
  await applyMigrations();
}

console.log('\nListo. Reiniciá el servidor de desarrollo (npm run dev) y probá subir archivos desde el Panel de Administración.\n');
