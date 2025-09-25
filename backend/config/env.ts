import dotenv from 'dotenv';

dotenv.config();

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const NODE_ENV = getEnv('NODE_ENV', 'development');
export const PORT = Number(getEnv('PORT', '4000'));
export const FRONTEND_URL = getEnv('FRONTEND_URL', 'https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--96435430.local-credentialless.webcontainer-api.io');
export const BACKEND_URL = getEnv('BACKEND_URL', 'https://trust-3.onrender.com');

// Optional at startup; validated by respective modules when used
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

export const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
export const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
export const PAYPAL_ENV = getEnv('PAYPAL_ENV', 'sandbox');
