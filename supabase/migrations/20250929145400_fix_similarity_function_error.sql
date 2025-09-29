-- Location: supabase/migrations/20250929145400_fix_similarity_function_error.sql
-- Schema Analysis: Existing prospects management system with find_account_duplicates function
-- Integration Type: Modification - Fix similarity function dependency
-- Dependencies: Existing accounts, prospects tables and find_account_duplicates function

-- Enable pg_trgm extension if available (Supabase should have this)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Alternative similarity function implementation that doesn't rely on pg_trgm
-- This will be used as fallback if pg_trgm is not available
CREATE OR REPLACE FUNCTION public.text_similarity_fallback(text1 TEXT, text2 TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    clean_text1 TEXT;
    clean_text2 TEXT;
    len1 INTEGER;
    len2 INTEGER;
    max_len INTEGER;
    common_chars INTEGER;
BEGIN
    -- Handle null inputs
    IF text1 IS NULL OR text2 IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Clean and normalize text
    clean_text1 := LOWER(TRIM(text1));
    clean_text2 := LOWER(TRIM(text2));
    
    -- Handle empty strings
    IF clean_text1 = '' OR clean_text2 = '' THEN
        RETURN 0;
    END IF;
    
    -- Exact match
    IF clean_text1 = clean_text2 THEN
        RETURN 1.0;
    END IF;
    
    len1 := LENGTH(clean_text1);
    len2 := LENGTH(clean_text2);
    max_len := GREATEST(len1, len2);
    
    -- Simple Levenshtein-based similarity
    -- This is a simplified implementation for basic string comparison
    common_chars := max_len - public.levenshtein_distance(clean_text1, clean_text2);
    
    -- Return similarity as ratio
    RETURN GREATEST(0, common_chars::NUMERIC / max_len);
END;
$$;

-- Simple Levenshtein distance implementation
CREATE OR REPLACE FUNCTION public.levenshtein_distance(s1 TEXT, s2 TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    len1 INTEGER := LENGTH(s1);
    len2 INTEGER := LENGTH(s2);
    matrix INTEGER[][];
    i INTEGER;
    j INTEGER;
    cost INTEGER;
BEGIN
    -- Handle edge cases
    IF s1 = s2 THEN RETURN 0; END IF;
    IF len1 = 0 THEN RETURN len2; END IF;
    IF len2 = 0 THEN RETURN len1; END IF;
    
    -- Initialize matrix
    FOR i IN 0..len1 LOOP
        matrix[i][0] := i;
    END LOOP;
    
    FOR j IN 0..len2 LOOP
        matrix[0][j] := j;
    END LOOP;
    
    -- Calculate distances
    FOR i IN 1..len1 LOOP
        FOR j IN 1..len2 LOOP
            IF SUBSTRING(s1, i, 1) = SUBSTRING(s2, j, 1) THEN
                cost := 0;
            ELSE
                cost := 1;
            END IF;
            
            matrix[i][j] := LEAST(
                matrix[i-1][j] + 1,      -- deletion
                matrix[i][j-1] + 1,      -- insertion
                matrix[i-1][j-1] + cost  -- substitution
            );
        END LOOP;
    END LOOP;
    
    RETURN matrix[len1][len2];
END;
$$;

-- Updated find_account_duplicates function that handles missing similarity function
CREATE OR REPLACE FUNCTION public.find_account_duplicates(
    prospect_name text, 
    prospect_domain text, 
    prospect_phone text, 
    prospect_city text, 
    prospect_state text, 
    current_tenant_id uuid
)
RETURNS TABLE(
    account_id uuid, 
    account_name text, 
    match_type text, 
    similarity_score numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    use_pg_trgm BOOLEAN := FALSE;
BEGIN
    -- Check if pg_trgm similarity function is available
    BEGIN
        PERFORM similarity('test', 'test');
        use_pg_trgm := TRUE;
    EXCEPTION 
        WHEN undefined_function THEN
            use_pg_trgm := FALSE;
    END;
    
    -- Return query with appropriate similarity function
    IF use_pg_trgm THEN
        RETURN QUERY
        SELECT 
            a.id,
            a.name,
            CASE 
                WHEN a.website IS NOT NULL AND prospect_domain IS NOT NULL 
                    AND LOWER(a.website) = LOWER(prospect_domain) THEN 'domain'
                WHEN a.phone IS NOT NULL AND prospect_phone IS NOT NULL 
                    AND regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(prospect_phone, '[^0-9]', '', 'g') THEN 'phone'
                WHEN similarity(LOWER(a.name), LOWER(prospect_name)) > 0.7 
                    AND (a.city IS NULL OR prospect_city IS NULL OR LOWER(a.city) = LOWER(prospect_city))
                    AND (a.state IS NULL OR prospect_state IS NULL OR LOWER(a.state) = LOWER(prospect_state)) THEN 'name_location'
                ELSE 'other'
            END as match_type,
            CASE 
                WHEN a.website IS NOT NULL AND prospect_domain IS NOT NULL 
                    AND LOWER(a.website) = LOWER(prospect_domain) THEN 1.0
                WHEN a.phone IS NOT NULL AND prospect_phone IS NOT NULL 
                    AND regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(prospect_phone, '[^0-9]', '', 'g') THEN 0.95
                ELSE similarity(LOWER(a.name), LOWER(prospect_name))
            END as similarity_score
        FROM public.accounts a
        WHERE a.tenant_id = current_tenant_id
        AND (
            -- Domain match
            (a.website IS NOT NULL AND prospect_domain IS NOT NULL 
             AND LOWER(a.website) = LOWER(prospect_domain))
            OR
            -- Phone match
            (a.phone IS NOT NULL AND prospect_phone IS NOT NULL 
             AND regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(prospect_phone, '[^0-9]', '', 'g'))
            OR
            -- Name similarity with location match
            (similarity(LOWER(a.name), LOWER(prospect_name)) > 0.7 
             AND (a.city IS NULL OR prospect_city IS NULL OR LOWER(a.city) = LOWER(prospect_city))
             AND (a.state IS NULL OR prospect_state IS NULL OR LOWER(a.state) = LOWER(prospect_state)))
        )
        ORDER BY similarity_score DESC
        LIMIT 5;
    ELSE
        -- Use fallback similarity function
        RETURN QUERY
        SELECT 
            a.id,
            a.name,
            CASE 
                WHEN a.website IS NOT NULL AND prospect_domain IS NOT NULL 
                    AND LOWER(a.website) = LOWER(prospect_domain) THEN 'domain'
                WHEN a.phone IS NOT NULL AND prospect_phone IS NOT NULL 
                    AND regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(prospect_phone, '[^0-9]', '', 'g') THEN 'phone'
                WHEN public.text_similarity_fallback(LOWER(a.name), LOWER(prospect_name)) > 0.7 
                    AND (a.city IS NULL OR prospect_city IS NULL OR LOWER(a.city) = LOWER(prospect_city))
                    AND (a.state IS NULL OR prospect_state IS NULL OR LOWER(a.state) = LOWER(prospect_state)) THEN 'name_location'
                ELSE 'other'
            END as match_type,
            CASE 
                WHEN a.website IS NOT NULL AND prospect_domain IS NOT NULL 
                    AND LOWER(a.website) = LOWER(prospect_domain) THEN 1.0
                WHEN a.phone IS NOT NULL AND prospect_phone IS NOT NULL 
                    AND regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(prospect_phone, '[^0-9]', '', 'g') THEN 0.95
                ELSE public.text_similarity_fallback(LOWER(a.name), LOWER(prospect_name))
            END as similarity_score
        FROM public.accounts a
        WHERE a.tenant_id = current_tenant_id
        AND (
            -- Domain match
            (a.website IS NOT NULL AND prospect_domain IS NOT NULL 
             AND LOWER(a.website) = LOWER(prospect_domain))
            OR
            -- Phone match
            (a.phone IS NOT NULL AND prospect_phone IS NOT NULL 
             AND regexp_replace(a.phone, '[^0-9]', '', 'g') = regexp_replace(prospect_phone, '[^0-9]', '', 'g'))
            OR
            -- Name similarity with location match
            (public.text_similarity_fallback(LOWER(a.name), LOWER(prospect_name)) > 0.7 
             AND (a.city IS NULL OR prospect_city IS NULL OR LOWER(a.city) = LOWER(prospect_city))
             AND (a.state IS NULL OR prospect_state IS NULL OR LOWER(a.state) = LOWER(prospect_state)))
        )
        ORDER BY similarity_score DESC
        LIMIT 5;
    END IF;
END;
$$;

-- Add comment to document the fix
COMMENT ON FUNCTION public.find_account_duplicates IS 'Updated function that handles missing pg_trgm extension by using fallback similarity implementation';
COMMENT ON FUNCTION public.text_similarity_fallback IS 'Fallback text similarity function for when pg_trgm extension is not available';
COMMENT ON FUNCTION public.levenshtein_distance IS 'Simple Levenshtein distance implementation for text similarity calculations';