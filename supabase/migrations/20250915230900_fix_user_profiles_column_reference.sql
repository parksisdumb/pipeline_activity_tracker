-- Fix user_profiles column reference issue
-- The error occurs because code is trying to reference 'user_id' column which doesn't exist
-- The actual primary key column is 'id'

-- Option 1: Add user_id column as an alias (NOT RECOMMENDED - creates data inconsistency)
-- ALTER TABLE public.user_profiles ADD COLUMN user_id UUID;
-- UPDATE public.user_profiles SET user_id = id;

-- Option 2: Create a view for backward compatibility (TEMPORARY SOLUTION)
-- CREATE OR REPLACE VIEW user_profiles_compat AS
-- SELECT 
--   id,
--   id as user_id, -- Alias id as user_id for backward compatibility
--   email,
--   full_name,
--   phone,
--   role,
--   is_active,
--   tenant_id,
--   created_at,
--   updated_at
-- FROM public.user_profiles;

-- RECOMMENDED SOLUTION: The issue is in the frontend code
-- Search for and replace any references to 'user_id' with 'id' in:
-- - Service files (*.js)
-- - Component files (*.jsx)
-- - Any Supabase queries using .eq('user_id', ...)

-- For now, let's add a comment to track this issue
COMMENT ON TABLE public.user_profiles IS 'Primary key is "id" - do not reference "user_id" in queries';

-- Add an index on id for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_profiles_id_lookup ON public.user_profiles(id);

-- Verify the schema is correct
DO $$
BEGIN
  -- Check if id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'id'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Primary key column "id" not found in user_profiles table';
  END IF;
  
  -- Check if user_id column exists (it shouldn't)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'user_id'
    AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Unexpected "user_id" column found - this may cause confusion';
  END IF;
  
  RAISE NOTICE 'Schema verification passed: user_profiles has "id" as primary key';
END $$;