
-- Fix security definer view: make it SECURITY INVOKER so RLS of querying user applies
ALTER VIEW public.appareils_enriched SET (security_invoker = on);
