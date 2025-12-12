-- Add signature_url column to business_profiles table
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'business_profiles' 
AND column_name = 'signature_url';
