/**
 * Verifies Supabase connectivity without printing secrets.
 * Run: npm run verify:supabase
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;

if (!url || !anon) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

function headers(key) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function probe(label, path, key) {
  const res = await fetch(`${url}${path}`, { headers: headers(key) });
  const text = await res.text();
  console.log(`${label}: HTTP ${res.status} — ${text.slice(0, 100).replace(/\s+/g, ' ')}`);
  return res;
}

console.log('── Supabase connectivity ──\n');

const anonSettings = await probe('Anon → site_settings', '/rest/v1/site_settings?select=id&limit=1', anon);
const anonProps = await probe('Anon → properties', '/rest/v1/properties?select=id&limit=1', anon);

if (anonSettings.status === 404 && anonSettings.ok === false) {
  console.log('  → site_settings no existe aún (aplicar migraciones con npm run setup:db)\n');
}
if (anonProps.ok) {
  console.log('  → Tabla properties accesible\n');
}

if (serviceKey) {
  const type = serviceKey.startsWith('sb_secret_') ? 'sb_secret' : 'JWT';
  console.log(`Service key: configurada (${type})`);
  const svc = await probe('Service → REST', '/rest/v1/', serviceKey);
  await probe('Service → Storage buckets', '/storage/v1/bucket', serviceKey);

  if (svc.status === 401) {
    console.log('\n✗ La clave de servicio no es válida.');
    console.log('  Copiá la Secret key completa desde Supabase Dashboard → Settings → API Keys.\n');
    process.exit(1);
  }
  console.log('\n✓ Clave de servicio válida');
} else {
  console.log('SUPABASE_SERVICE_ROLE_KEY: no configurada');
}

if (dbUrl) {
  console.log('SUPABASE_DB_URL: configurada');
  try {
    const { default: postgres } = await import('postgres');
    const client = postgres(dbUrl, { ssl: 'require', max: 1 });
    const rows = await client`SELECT current_database() AS db, version() AS version`;
    await client.end({ timeout: 5 });
    console.log(`✓ Conexión PostgreSQL OK (${rows[0].db})`);
  } catch (err) {
    console.log('✗ SUPABASE_DB_URL no conecta:', err instanceof Error ? err.message : err);
  }
} else {
  console.log('\nSUPABASE_DB_URL: no configurada (necesaria para migraciones automáticas)');
}
