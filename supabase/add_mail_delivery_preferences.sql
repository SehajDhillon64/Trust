-- Add mail delivery preference enum and columns to residents
-- Safe to run multiple times

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'mail_delivery_preference' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.mail_delivery_preference AS ENUM ('resident_room', 'reception', 'other');
  END IF;
END
$$;

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'residents' AND column_name = 'mail_delivery_preference'
  ) THEN
    ALTER TABLE public.residents
      ADD COLUMN mail_delivery_preference public.mail_delivery_preference DEFAULT 'resident_room'::public.mail_delivery_preference;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'residents' AND column_name = 'mail_delivery_note'
  ) THEN
    ALTER TABLE public.residents
      ADD COLUMN mail_delivery_note text;
  END IF;
END
$$;

-- Optional: set NOT NULL + default for preference if desired (commented out)
-- ALTER TABLE public.residents ALTER COLUMN mail_delivery_preference SET NOT NULL;

