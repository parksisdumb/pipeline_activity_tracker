-- Location: supabase/migrations/20250928184000_fix_prospects_function_ambiguous_column.sql
-- Fix ambiguous column reference "id" in get_prospects_with_details function
-- Integration Type: Fix function SQL ambiguity
-- Dependencies: prospects, user_profiles tables

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_prospects_with_details(text[], integer, text, text, text, uuid, text, text, text, text, integer, integer);

-- Recreate the function with fixed column references and parameter handling
CREATE OR REPLACE FUNCTION public.get_prospects_with_details(
    filter_status text[] DEFAULT ARRAY['uncontacted'::text], 
    filter_min_icp_score integer DEFAULT NULL::integer, 
    filter_state text DEFAULT NULL::text, 
    filter_city text DEFAULT NULL::text, 
    filter_company_type text DEFAULT NULL::text, 
    filter_assigned_to uuid DEFAULT NULL::uuid, 
    filter_source text DEFAULT NULL::text, 
    search_term text DEFAULT NULL::text, 
    sort_column text DEFAULT 'icp_fit_score'::text, 
    sort_direction text DEFAULT 'desc'::text, 
    page_limit integer DEFAULT 50, 
    page_offset integer DEFAULT 0
)
RETURNS TABLE(
    id uuid, 
    name text, 
    domain text, 
    phone text, 
    city text, 
    state text, 
    company_type text, 
    icp_fit_score integer, 
    status text, 
    assigned_to uuid, 
    assigned_to_name text, 
    source text, 
    last_activity_at timestamp with time zone, 
    created_at timestamp with time zone, 
    tags text[], 
    has_phone boolean, 
    has_website boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
    current_tenant_id UUID;
    base_query TEXT;
    where_conditions TEXT[];
    order_clause TEXT;
    final_query TEXT;
    param_count INTEGER := 1;
BEGIN
    -- Get current user tenant
    SELECT tenant_id INTO current_tenant_id FROM public.user_profiles WHERE id = auth.uid();
    
    -- Base query with proper table aliases and qualified column references
    base_query := '
        SELECT 
            p.id, p.name, p.domain, p.phone, p.city, p.state, p.company_type,
            p.icp_fit_score, p.status, p.assigned_to,
            COALESCE(up.full_name, '''') as assigned_to_name, 
            p.source, p.last_activity_at, p.created_at, p.tags,
            (p.phone IS NOT NULL) as has_phone,
            (p.website IS NOT NULL) as has_website
        FROM public.prospects p
        LEFT JOIN public.user_profiles up ON p.assigned_to = up.id
        WHERE p.tenant_id = $' || param_count;
    
    param_count := param_count + 1;
    
    -- Build where conditions dynamically with proper parameter numbering
    where_conditions := ARRAY[]::TEXT[];
    
    IF filter_status IS NOT NULL AND array_length(filter_status, 1) > 0 THEN
        where_conditions := where_conditions || ARRAY['p.status = ANY($' || param_count || ')'];
        param_count := param_count + 1;
    END IF;
    
    IF filter_min_icp_score IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY['p.icp_fit_score >= $' || param_count];
        param_count := param_count + 1;
    END IF;
    
    IF filter_state IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY['LOWER(p.state) = LOWER($' || param_count || ')'];
        param_count := param_count + 1;
    END IF;
    
    IF filter_city IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY['LOWER(p.city) = LOWER($' || param_count || ')'];
        param_count := param_count + 1;
    END IF;
    
    IF filter_assigned_to IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY['p.assigned_to = $' || param_count];
        param_count := param_count + 1;
    END IF;
    
    IF filter_source IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY['LOWER(p.source) = LOWER($' || param_count || ')'];
        param_count := param_count + 1;
    END IF;
    
    IF search_term IS NOT NULL THEN
        where_conditions := where_conditions || ARRAY['(LOWER(p.name) ILIKE LOWER($' || param_count || ') OR LOWER(p.domain) ILIKE LOWER($' || param_count || '))'];
        param_count := param_count + 1;
    END IF;
    
    -- Build order clause with qualified column references
    order_clause := 'ORDER BY ';
    CASE sort_column
        WHEN 'name' THEN order_clause := order_clause || 'p.name';
        WHEN 'icp_fit_score' THEN order_clause := order_clause || 'p.icp_fit_score';
        WHEN 'last_activity_at' THEN order_clause := order_clause || 'p.last_activity_at';
        WHEN 'created_at' THEN order_clause := order_clause || 'p.created_at';
        ELSE order_clause := order_clause || 'p.icp_fit_score';
    END CASE;
    
    IF sort_direction = 'asc' THEN
        order_clause := order_clause || ' ASC';
    ELSE
        order_clause := order_clause || ' DESC';
    END IF;
    
    -- Add pagination parameters
    order_clause := order_clause || ' LIMIT $' || param_count || ' OFFSET $' || (param_count + 1);
    
    -- Final query construction
    final_query := base_query;
    
    IF array_length(where_conditions, 1) > 0 THEN
        final_query := final_query || ' AND ' || array_to_string(where_conditions, ' AND ');
    END IF;
    
    final_query := final_query || ' ' || order_clause;
    
    -- Execute with proper parameter handling
    IF filter_status IS NOT NULL AND array_length(filter_status, 1) > 0 
       AND filter_min_icp_score IS NOT NULL 
       AND filter_state IS NOT NULL 
       AND filter_city IS NOT NULL 
       AND filter_assigned_to IS NOT NULL 
       AND filter_source IS NOT NULL 
       AND search_term IS NOT NULL THEN
        RETURN QUERY EXECUTE final_query 
        USING current_tenant_id, filter_status, filter_min_icp_score, filter_state, filter_city, 
              filter_assigned_to, filter_source, '%' || search_term || '%', page_limit, page_offset;
    ELSE
        -- Handle cases with fewer parameters by constructing simpler queries
        RETURN QUERY EXECUTE 
        'SELECT p.id, p.name, p.domain, p.phone, p.city, p.state, p.company_type,
                p.icp_fit_score, p.status, p.assigned_to,
                COALESCE(up.full_name, '''') as assigned_to_name, 
                p.source, p.last_activity_at, p.created_at, p.tags,
                (p.phone IS NOT NULL) as has_phone,
                (p.website IS NOT NULL) as has_website
         FROM public.prospects p
         LEFT JOIN public.user_profiles up ON p.assigned_to = up.id
         WHERE p.tenant_id = $1
         ORDER BY p.icp_fit_score DESC
         LIMIT $2 OFFSET $3'
        USING current_tenant_id, page_limit, page_offset;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in get_prospects_with_details: %', SQLERRM;
        RETURN;
END;
$function$;