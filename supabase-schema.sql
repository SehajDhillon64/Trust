-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cash_box_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 2500.00,
  updated_by uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cash_box_balances_pkey PRIMARY KEY (id),
  CONSTRAINT cash_box_balances_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT cash_box_balances_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);
CREATE TABLE public.cash_box_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL,
  transaction_id text NOT NULL UNIQUE,
  transaction_type text NOT NULL CHECK (transaction_type = ANY (ARRAY['withdrawal'::text, 'deposit'::text])),
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  description text NOT NULL,
  resident_id uuid,
  balance_after numeric NOT NULL CHECK (balance_after >= 0::numeric),
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  resident_name text,
  created_by_name text,
  main_transaction_id uuid,
  CONSTRAINT cash_box_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT cash_box_transactions_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id),
  CONSTRAINT cash_box_transactions_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT cash_box_transactions_main_transaction_id_fkey FOREIGN KEY (main_transaction_id) REFERENCES public.transactions(id),
  CONSTRAINT cash_box_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.facilities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text NOT NULL,
  phone text,
  email text NOT NULL,
  office_manager_email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  status USER-DEFINED DEFAULT 'active'::facility_status,
  unique_code text NOT NULL UNIQUE,
  company_id uuid,
  CONSTRAINT facilities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.manual_money_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  facility_id uuid NOT NULL,
  amount numeric NOT NULL,
  type USER-DEFINED NOT NULL,
  description text NOT NULL,
  added_by uuid NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  CONSTRAINT manual_money_entries_pkey PRIMARY KEY (id),
  CONSTRAINT manual_money_entries_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT manual_money_entries_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id)
);
CREATE TABLE public.monthly_cash_box_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL,
  year integer NOT NULL,
  month integer NOT NULL,
  starting_balance numeric NOT NULL,
  ending_balance numeric NOT NULL,
  reset_by uuid NOT NULL,
  reset_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT monthly_cash_box_history_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_cash_box_history_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT monthly_cash_box_history_reset_by_fkey FOREIGN KEY (reset_by) REFERENCES public.users(id)
);
CREATE TABLE public.monthly_pre_auth_lists (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  facility_id uuid NOT NULL,
  month text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'closed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  closed_at timestamp with time zone,
  closed_by uuid,
  total_amount numeric NOT NULL DEFAULT 0.00,
  CONSTRAINT monthly_pre_auth_lists_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_pre_auth_lists_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT monthly_pre_auth_lists_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id)
);
CREATE TABLE public.pre_auth_debits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  resident_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  authorized_by uuid NOT NULL,
  description text NOT NULL,
  authorized_date date NOT NULL,
  target_month text NOT NULL,
  amount numeric NOT NULL,
  type USER-DEFINED NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  status USER-DEFINED DEFAULT 'pending'::preauth_status,
  CONSTRAINT pre_auth_debits_pkey PRIMARY KEY (id),
  CONSTRAINT pre_auth_debits_authorized_by_fkey FOREIGN KEY (authorized_by) REFERENCES public.users(id),
  CONSTRAINT pre_auth_debits_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT pre_auth_debits_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id)
);
CREATE TABLE public.residents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  resident_id text NOT NULL,
  name text NOT NULL,
  dob date NOT NULL,
  trust_balance numeric DEFAULT 0.00,
  is_self_managed boolean DEFAULT false,
  linked_user_id uuid,
  ltc_unit text,
  status USER-DEFINED DEFAULT 'active'::resident_status,
  created_at timestamp with time zone DEFAULT now(),
  facility_id uuid NOT NULL,
  bank_details jsonb,
  allowed_services jsonb NOT NULL DEFAULT '{"cable": false, "footcare": false, "haircare": false, "pharmacy": false, "wheelchairRepair": false, "miscellaneous": false}'::jsonb,
  service_authorizations jsonb,
  CONSTRAINT residents_pkey PRIMARY KEY (id),
  CONSTRAINT residents_linked_user_id_fkey FOREIGN KEY (linked_user_id) REFERENCES public.users(id),
  CONSTRAINT residents_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id)
);
CREATE TABLE public.service_batch_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  batch_id uuid NOT NULL,
  resident_id uuid NOT NULL,
  amount numeric NOT NULL,
  status USER-DEFINED DEFAULT 'pending'::batch_item_status,
  error_message text,
  processed_at timestamp with time zone,
  CONSTRAINT service_batch_items_pkey PRIMARY KEY (id),
  CONSTRAINT service_batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.service_batches(id),
  CONSTRAINT service_batch_items_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id)
);
CREATE TABLE public.service_batches (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  facility_id uuid NOT NULL,
  service_type USER-DEFINED NOT NULL,
  status USER-DEFINED DEFAULT 'open'::batch_status,
  created_at timestamp with time zone DEFAULT now(),
  posted_at timestamp with time zone,
  created_by uuid NOT NULL,
  posted_by uuid,
  total_amount numeric DEFAULT 0.00,
  processed_count integer DEFAULT 0,
  CONSTRAINT service_batches_pkey PRIMARY KEY (id),
  CONSTRAINT service_batches_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT service_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT service_batches_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id)
);
CREATE TABLE public.signup_invitations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  facility_id uuid NOT NULL,
  email text NOT NULL,
  role USER-DEFINED NOT NULL CHECK (role = ANY (ARRAY['OM'::user_role, 'POA'::user_role, 'Resident'::user_role])),
  invited_by uuid NOT NULL,
  invited_at timestamp with time zone DEFAULT now(),
  status USER-DEFINED DEFAULT 'pending'::invitation_status,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  resident_id uuid,
  CONSTRAINT signup_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT signup_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id),
  CONSTRAINT signup_invitations_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT signup_invitations_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  resident_id uuid NOT NULL,
  facility_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  amount numeric NOT NULL,
  method USER-DEFINED NOT NULL,
  description text NOT NULL,
  created_by uuid NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id),
  CONSTRAINT transactions_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role USER-DEFINED NOT NULL,
  facility_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  auth_user_id uuid NOT NULL UNIQUE,
  company_id uuid,
  terms_accepted_at timestamp with time zone,
  terms_version text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_facility_id_fkey FOREIGN KEY (facility_id) REFERENCES public.facilities(id),
  CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
);
CREATE TYPE public.invoice_status AS ENUM ('open', 'submitted', 'paid');
-- Extend user_role enum note: for context only
-- ALTER TYPE public.user_role ADD VALUE 'Vendor';

CREATE TABLE public.vendor_facilities (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  vendor_user_id uuid NOT NULL REFERENCES public.users(id),
  facility_id uuid NOT NULL REFERENCES public.facilities(id),
  created_at timestamp with time zone DEFAULT now(),
  company_id uuid,
  CONSTRAINT vendor_facilities_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_facilities_unique UNIQUE (vendor_user_id, facility_id)
);

CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id),
  vendor_user_id uuid NOT NULL REFERENCES public.users(id),
  status public.invoice_status NOT NULL DEFAULT 'open',
  om_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  submitted_at timestamp with time zone,
  paid_at timestamp with time zone,
  paid_by uuid REFERENCES public.users(id),
  vendor_name text,
  vendor_address text,
  vendor_email text,
  invoice_date date,
  company_id uuid,
  CONSTRAINT invoices_pkey PRIMARY KEY (id)
);

CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.residents(id),
  amount numeric NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id)
);