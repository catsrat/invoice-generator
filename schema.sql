-- Create invoices table
create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_number text not null,
  
  -- Business information
  business_name text,
  business_address text,
  business_email text,
  business_phone text,
  
  -- Client information
  client_name text,
  client_address text,
  client_email text,
  client_phone text,
  
  -- Invoice metadata
  invoice_date date,
  due_date date,
  currency text default 'INR',
  
  -- Line items (stored as JSON)
  line_items jsonb default '[]'::jsonb,
  
  -- Calculations
  tax_rate numeric default 0,
  discount_rate numeric default 0,
  
  -- Additional info
  notes text,
  signature_url text,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index on user_id for faster queries
create index if not exists invoices_user_id_idx on public.invoices(user_id);

-- Create index on invoice_number for faster lookups
create index if not exists invoices_invoice_number_idx on public.invoices(invoice_number);

-- Enable Row Level Security
alter table public.invoices enable row level security;

-- Create policies for Row Level Security
-- Users can view their own invoices
create policy "Users can view their own invoices"
  on public.invoices
  for select
  using (auth.uid() = user_id);

-- Users can insert their own invoices
create policy "Users can insert their own invoices"
  on public.invoices
  for insert
  with check (auth.uid() = user_id);

-- Users can update their own invoices
create policy "Users can update their own invoices"
  on public.invoices
  for update
  using (auth.uid() = user_id);

-- Users can delete their own invoices
create policy "Users can delete their own invoices"
  on public.invoices
  for delete
  using (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger set_updated_at
  before update on public.invoices
  for each row
  execute function public.handle_updated_at();
