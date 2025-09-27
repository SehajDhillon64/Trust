-- Adds a legacy-compatible column `last_updated` to public.cash_box_balances
-- to satisfy existing RPCs that reference it. Also backfills and keeps it
-- in sync on updates.

BEGIN;

-- 1) Add column if it does not exist
ALTER TABLE public.cash_box_balances
  ADD COLUMN IF NOT EXISTS last_updated timestamp with time zone;

COMMENT ON COLUMN public.cash_box_balances.last_updated IS 'Legacy/compat column used by RPCs; mirrors updated_at';

-- 2) Backfill existing rows
UPDATE public.cash_box_balances
SET last_updated = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
WHERE last_updated IS NULL;

-- 3) Trigger function to maintain last_updated on UPDATE
CREATE OR REPLACE FUNCTION public.set_cash_box_last_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$;

-- 4) Create trigger if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_cash_box_last_updated'
  ) THEN
    CREATE TRIGGER trg_set_cash_box_last_updated
    BEFORE UPDATE ON public.cash_box_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.set_cash_box_last_updated();
  END IF;
END;
$$;

COMMIT;

