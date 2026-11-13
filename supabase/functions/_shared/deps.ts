import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

export { Stripe }

export const env = (k: string) => {
  const v = Deno.env.get(k)
  if (!v) throw new Error(`Falta la variable ${k}`)
  return v
}

export const stripeClient = () =>
  new Stripe(env('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient() })

/** Cliente con permisos de servidor (salta RLS). Solo existe dentro de las funciones. */
export const adminDb = () =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Opciones de recogida que muestra Stripe (value: solo letras/números). */
export const PICKUP: Record<string, string> = {
  asap: 'Lo antes posible', min30: 'En 30 minutos', h1: 'En 1 hora', h2: 'En 2 horas',
}
