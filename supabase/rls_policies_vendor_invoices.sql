-- Add 'Vendor' to user_role enum if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'Vendor'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'Vendor';
  END IF;
END $$;

-- Enable RLS on vendor/invoice related tables
ALTER TABLE public.vendor_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Vendor facilities: SELECT policies
DROP POLICY IF EXISTS "Vendor can read own facility links" ON public.vendor_facilities;
CREATE POLICY "Vendor can read own facility links"
  ON public.vendor_facilities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'Vendor'
        AND u.id = vendor_facilities.vendor_user_id
    )
  );

DROP POLICY IF EXISTS "OM can read vendor links for their facility" ON public.vendor_facilities;
CREATE POLICY "OM can read vendor links for their facility"
  ON public.vendor_facilities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'OM'
        AND u.facility_id = vendor_facilities.facility_id
    )
  );

-- Invoices: SELECT policies
DROP POLICY IF EXISTS "Vendor can read own invoices" ON public.invoices;
CREATE POLICY "Vendor can read own invoices"
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'Vendor'
        AND u.id = invoices.vendor_user_id
    )
  );

DROP POLICY IF EXISTS "OM can read facility invoices" ON public.invoices;
CREATE POLICY "OM can read facility invoices"
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'OM'
        AND u.facility_id = invoices.facility_id
    )
  );

-- Invoices: INSERT (vendor only)
DROP POLICY IF EXISTS "Vendor can create invoice for linked facility" ON public.invoices;
CREATE POLICY "Vendor can create invoice for assigned facility"
  ON public.invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'Vendor'
        AND u.id = invoices.vendor_user_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.vendor_facilities vf
        WHERE vf.vendor_user_id = invoices.vendor_user_id
          AND vf.facility_id = invoices.facility_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.users u2
        WHERE u2.id = invoices.vendor_user_id
          AND u2.facility_id = invoices.facility_id
      )
    )
  );

-- Invoices: UPDATE (vendor on own open invoices)
DROP POLICY IF EXISTS "Vendor can update own open invoices" ON public.invoices;
CREATE POLICY "Vendor can update own open invoices"
  ON public.invoices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'Vendor'
        AND u.id = invoices.vendor_user_id
    )
    AND invoices.status = 'open'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'Vendor'
        AND u.id = invoices.vendor_user_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.vendor_facilities vf
        WHERE vf.vendor_user_id = invoices.vendor_user_id
          AND vf.facility_id = invoices.facility_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.users u2
        WHERE u2.id = invoices.vendor_user_id
          AND u2.facility_id = invoices.facility_id
      )
    )
    AND invoices.status IN ('open', 'submitted')
  );

-- Invoices: UPDATE (OM on their facility's invoices)
DROP POLICY IF EXISTS "OM can update invoices for their facility" ON public.invoices;
CREATE POLICY "OM can update invoices for their facility"
  ON public.invoices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'OM'
        AND u.facility_id = invoices.facility_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'OM'
        AND u.facility_id = invoices.facility_id
    )
  );

-- Invoice items: SELECT policies
DROP POLICY IF EXISTS "Vendor can read items of own invoices" ON public.invoice_items;
CREATE POLICY "Vendor can read items of own invoices"
  ON public.invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.users u ON u.auth_user_id = auth.uid()
      WHERE i.id = invoice_items.invoice_id
        AND u.role = 'Vendor'
        AND u.id = i.vendor_user_id
    )
  );

DROP POLICY IF EXISTS "OM can read items for facility invoices" ON public.invoice_items;
CREATE POLICY "OM can read items for facility invoices"
  ON public.invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.users u ON u.auth_user_id = auth.uid()
      WHERE i.id = invoice_items.invoice_id
        AND u.role = 'OM'
        AND u.facility_id = i.facility_id
    )
  );

-- Invoice items: INSERT (vendor only on open invoices they own)
DROP POLICY IF EXISTS "Vendor can add items to own open invoices" ON public.invoice_items;
CREATE POLICY "Vendor can add items to own open invoices"
  ON public.invoice_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.users u ON u.auth_user_id = auth.uid()
      WHERE i.id = invoice_items.invoice_id
        AND u.role = 'Vendor'
        AND u.id = i.vendor_user_id
        AND i.status = 'open'
    )
  );

-- Invoice items: UPDATE (vendor only on open invoices they own)
DROP POLICY IF EXISTS "Vendor can update items on own open invoices" ON public.invoice_items;
CREATE POLICY "Vendor can update items on own open invoices"
  ON public.invoice_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.users u ON u.auth_user_id = auth.uid()
      WHERE i.id = invoice_items.invoice_id
        AND u.role = 'Vendor'
        AND u.id = i.vendor_user_id
        AND i.status = 'open'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.users u ON u.auth_user_id = auth.uid()
      WHERE i.id = invoice_items.invoice_id
        AND u.role = 'Vendor'
        AND u.id = i.vendor_user_id
        AND i.status = 'open'
    )
  );

-- Invoice items: DELETE (vendor only on open invoices they own)
DROP POLICY IF EXISTS "Vendor can delete items on own open invoices" ON public.invoice_items;
CREATE POLICY "Vendor can delete items on own open invoices"
  ON public.invoice_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.users u ON u.auth_user_id = auth.uid()
      WHERE i.id = invoice_items.invoice_id
        AND u.role = 'Vendor'
        AND u.id = i.vendor_user_id
        AND i.status = 'open'
    )
  );

-- Allow vendors to create their own vendor-facility link
DROP POLICY IF EXISTS "Vendor can link to a facility" ON public.vendor_facilities;
-- Tighten: Only Admin or OM can link vendors to facilities; vendors cannot self-link
CREATE POLICY "Admin or OM can link vendor to facility"
  ON public.vendor_facilities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND (u.role = 'Admin' OR (u.role = 'OM' AND u.facility_id = vendor_facilities.facility_id))
    )
  );