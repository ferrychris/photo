-- Security Verification Script
-- Run this after deploying the security migration to verify everything is working

-- ============================================================================
-- 1. VERIFY RLS POLICIES ARE ACTIVE
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN ('collages', 'photos', 'collage_settings', 'profiles', 'subscriptions', 'subscription_features')
ORDER BY tablename;

-- ============================================================================
-- 2. CHECK POLICY COVERAGE
-- ============================================================================

SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('collages', 'photos', 'collage_settings', 'profiles', 'subscriptions', 'subscription_features')
ORDER BY tablename, cmd;

-- ============================================================================
-- 3. VERIFY CONSTRAINTS ARE ACTIVE
-- ============================================================================

SELECT 
  table_name,
  constraint_name,
  constraint_type,
  is_deferrable,
  initially_deferred
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name IN ('collages', 'photos', 'profiles')
  AND constraint_type = 'CHECK'
ORDER BY table_name;

-- ============================================================================
-- 4. TEST SECURITY FUNCTIONS
-- ============================================================================

-- Test security metrics function
SELECT get_security_metrics();

-- Test suspicious activity detection
SELECT * FROM detect_suspicious_activity();

-- Test security policy verification
SELECT * FROM verify_security_policies();

-- ============================================================================
-- 5. VERIFY AUDIT LOGGING IS WORKING
-- ============================================================================

-- Check if audit_logs table exists and is accessible
SELECT 
  table_name,
  is_insertable_into,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'audit_logs';

-- Check audit log structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- ============================================================================
-- 6. TEST APPLICATION FUNCTIONALITY
-- ============================================================================

-- Test 1: Verify public can view collages (should work)
SET ROLE anon;
SELECT count(*) as public_collage_count FROM collages;

-- Test 2: Verify public can view photos (should work)
SELECT count(*) as public_photo_count FROM photos;

-- Test 3: Verify public cannot create collages without auth (should fail)
-- This should return an error - that's expected and correct
-- INSERT INTO collages (name, code) VALUES ('test', 'TEST'); -- Uncomment to test

-- Reset role
RESET ROLE;

-- ============================================================================
-- 7. PERFORMANCE VERIFICATION
-- ============================================================================

-- Check that new indexes exist
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- 8. FINAL SECURITY STATUS
-- ============================================================================

-- Get overall security status
WITH security_summary AS (
  SELECT 
    table_name,
    CASE 
      WHEN status = 'SECURE' THEN 1 
      ELSE 0 
    END as is_secure
  FROM verify_security_policies()
)
SELECT 
  count(*) as total_tables,
  sum(is_secure) as secure_tables,
  CASE 
    WHEN count(*) = sum(is_secure) THEN '✅ ALL TABLES SECURE'
    ELSE '⚠️ SOME TABLES NEED ATTENTION'
  END as overall_status
FROM security_summary;

-- Show any tables that need attention
SELECT 
  table_name,
  policy_count,
  has_rls,
  status,
  CASE 
    WHEN status != 'SECURE' THEN '⚠️ NEEDS ATTENTION'
    ELSE '✅ SECURE'
  END as action_needed
FROM verify_security_policies()
WHERE status != 'SECURE';

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================

SELECT 
  'Security verification completed' as message,
  now() as timestamp,
  current_user as verified_by;