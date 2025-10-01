-- Drop default for mail_delivery_preference so new rows default to NULL
ALTER TABLE IF EXISTS public.residents
  ALTER COLUMN mail_delivery_preference DROP DEFAULT;

