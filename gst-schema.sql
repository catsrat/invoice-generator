-- Create business_profiles table for persistent business information
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) unique not null,
  
  -- Company Information
  company_name text not null,
  gst_number text,
  company_logo_url text,
  
  -- Contact Information
  billing_address text,
  email text,
  phone text,
  
  -- Payment Information
  upi_qr_code_url text,
  bank_name text,
  bank_account_number text,
  bank_ifsc_code text,
  bank_branch text,
  signature_url text,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_profiles
CREATE POLICY "Users can view their own profile"
  ON public.business_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.business_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.business_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.business_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at on business_profiles
CREATE TRIGGER set_business_profile_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add new columns to existing invoices table for GST compliance
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_logo_url text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS upi_qr_code_url text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS bank_ifsc_code text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS bank_branch text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS place_of_supply text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_gstin text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_pan text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cgst_rate numeric default 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sgst_rate numeric default 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS igst_rate numeric default 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_paid numeric default 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS terms_conditions text;

-- Create index on gst_number for faster searches
CREATE INDEX IF NOT EXISTS invoices_gst_number_idx ON public.invoices(gst_number);
CREATE INDEX IF NOT EXISTS business_profiles_user_id_idx ON public.business_profiles(user_id);
