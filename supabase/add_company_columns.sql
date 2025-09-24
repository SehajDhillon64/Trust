-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add company_id to facilities and users
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id uuid;

-- Optional: Add company_id to invoices and vendor_facilities for scoping
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.vendor_facilities ADD COLUMN IF NOT EXISTS company_id uuid;

-- Create foreign keys (FKs) once columns exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'facilities_company_id_fkey'
  ) THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_company_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoices_company_id_fkey'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vendor_facilities_company_id_fkey'
  ) THEN
    ALTER TABLE public.vendor_facilities
      ADD CONSTRAINT vendor_facilities_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_facilities_company_id ON public.facilities(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_vendor_facilities_company_id ON public.vendor_facilities(company_id);

-- Backfill strategy (example): if a facility has no company, create one per unique email domain
-- NOTE: Adjust this logic to your real world mapping! This is a safe placeholder.
DO $$
DECLARE rec RECORD; new_company_id uuid; domain text;
BEGIN
  FOR rec IN (
    SELECT id, email FROM public.facilities WHERE company_id IS NULL
  ) LOOP
    domain := split_part(rec.email, '@', 2);
    IF domain IS NULL OR domain = '' THEN
      domain := 'default.local';
    END IF;

    -- Try find existing company by name==domain
    SELECT id INTO new_company_id FROM public.companies WHERE name = domain LIMIT 1;
    IF new_company_id IS NULL THEN
      INSERT INTO public.companies(name) VALUES (domain) RETURNING id INTO new_company_id;
    END IF;

    UPDATE public.facilities SET company_id = new_company_id WHERE id = rec.id;
  END LOOP;

  -- Backfill users by their facility company when possible
  UPDATE public.users u
  SET company_id = f.company_id
  FROM public.facilities f
  WHERE u.facility_id = f.id AND u.company_id IS NULL;
END $$;

-- Optional RLS examples: ensure RLS is enabled and restrict by company
-- Adjust as needed for your app tables
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read facilities by company" ON public.facilities;
CREATE POLICY "Admins can read facilities by company" ON public.facilities
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'Admin'
      AND u.company_id = facilities.company_id
  )
  OR EXISTS (
    SELECT 1 FROM public.users u2
    WHERE u2.auth_user_id = auth.uid()
      AND u2.role = 'OM'
      AND u2.facility_id = facilities.id
  )
);

-- Consider similar policies for users/residents/transactions as needed.