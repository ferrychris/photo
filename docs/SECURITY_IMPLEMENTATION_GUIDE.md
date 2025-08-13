# Security Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the database security fixes for PhotoSphere while ensuring zero downtime and full application functionality.

## Pre-Implementation Checklist

### 1. **Backup Verification**
```sql
-- Verify recent backups exist
SELECT 
  backup_name,
  backup_time,
  backup_size
FROM pg_stat_backup_history 
ORDER BY backup_time DESC 
LIMIT 5;
```

### 2. **Current State Documentation**
```sql
-- Document current policy state
\copy (SELECT * FROM pg_policies WHERE schemaname = 'public') TO 'current_policies_backup.csv' CSV HEADER;

-- Document current constraints
\copy (SELECT * FROM information_schema.table_constraints WHERE table_schema = 'public') TO 'current_constraints_backup.csv' CSV HEADER;
```

## Implementation Steps

### Phase 1: Deploy Security Migration (5 minutes)

1. **Apply the security migration**:
   ```bash
   # Navigate to your project
   cd your-project-directory
   
   # Apply the migration
   supabase db push
   ```

2. **Verify migration success**:
   ```sql
   -- Check migration was applied
   SELECT * FROM supabase_migrations.schema_migrations 
   ORDER BY version DESC LIMIT 5;
   ```

### Phase 2: Immediate Verification (10 minutes)

1. **Run security verification script**:
   ```bash
   # Execute the verification script
   psql -f scripts/verify-security.sql
   ```

2. **Test critical application functions**:
   ```bash
   # Test anonymous photo upload
   curl -X POST "your-app-url/api/photos" \
     -H "Content-Type: application/json" \
     -d '{"collage_id": "test-id", "url": "https://example.com/test.jpg"}'
   
   # Test authenticated collage creation
   # (Use your app's frontend or API testing tool)
   ```

### Phase 3: Application Function Testing (15 minutes)

#### **Test Checklist**:
- [ ] Anonymous users can view collages by code
- [ ] Anonymous users can upload photos to collages
- [ ] Authenticated users can create new collages
- [ ] Collage owners can modify their collage settings
- [ ] Collage owners can delete photos from their collages
- [ ] Subscription webhooks still update profiles correctly
- [ ] Real-time photo updates continue working

#### **Test Commands**:
```sql
-- Test 1: Public collage viewing (should work)
SET ROLE anon;
SELECT id, name, code FROM collages LIMIT 5;

-- Test 2: Public photo viewing (should work)
SELECT id, url FROM photos LIMIT 5;

-- Test 3: Anonymous collage creation (should fail - this is correct)
-- INSERT INTO collages (name, code) VALUES ('test', 'TEST'); -- Should fail

RESET ROLE;

-- Test 4: Authenticated operations (should work for owners)
-- These would be tested through your application
```

## Monitoring During Implementation

### **Real-time Monitoring Commands**

1. **Monitor active connections**:
   ```sql
   SELECT 
     count(*) as active_connections,
     state,
     application_name
   FROM pg_stat_activity 
   WHERE state = 'active'
   GROUP BY state, application_name;
   ```

2. **Monitor for errors**:
   ```sql
   -- Check for recent errors in logs
   SELECT 
     log_time,
     error_severity,
     message
   FROM pg_log 
   WHERE log_time > now() - interval '1 hour'
     AND error_severity IN ('ERROR', 'FATAL')
   ORDER BY log_time DESC;
   ```

3. **Monitor policy violations**:
   ```sql
   -- This will show if any operations are being blocked unexpectedly
   SELECT 
     schemaname,
     tablename,
     operation,
     count(*) as blocked_attempts
   FROM pg_stat_user_tables
   WHERE schemaname = 'public'
   GROUP BY schemaname, tablename, operation;
   ```

## Rollback Procedures

### **Emergency Rollback (if application breaks)**

If critical application functionality is broken, use these emergency rollback commands:

```sql
-- EMERGENCY: Restore permissive policies for collages
DROP POLICY IF EXISTS "Authenticated users can create collages" ON collages;
CREATE POLICY "Emergency_anyone_can_create_collages" ON collages 
  FOR ALL TO public USING (true) WITH CHECK (true);

-- EMERGENCY: Restore permissive policies for photos  
DROP POLICY IF EXISTS "Anyone can upload photos to collages" ON photos;
CREATE POLICY "Emergency_photos_completely_open" ON photos 
  FOR ALL TO public USING (true) WITH CHECK (true);

-- EMERGENCY: Restore permissive policies for settings
DROP POLICY IF EXISTS "Collage owners can update their settings" ON collage_settings;
CREATE POLICY "Emergency_settings_completely_open" ON collage_settings 
  FOR ALL TO public USING (true) WITH CHECK (true);
```

### **Gradual Rollback (for specific issues)**

If only specific functionality is affected:

1. **Identify the problematic policy**:
   ```sql
   -- Find policies causing issues
   SELECT * FROM pg_policies 
   WHERE tablename = 'affected_table_name';
   ```

2. **Temporarily relax specific policy**:
   ```sql
   -- Example: Temporarily allow anonymous collage creation
   CREATE POLICY "Temp_anonymous_collage_creation" ON collages
     FOR INSERT TO public WITH CHECK (true);
   ```

3. **Monitor and fix root cause**

## Post-Implementation Monitoring

### **24-Hour Monitoring Schedule**

#### **Hour 1-4: Intensive Monitoring**
- Check application logs every 30 minutes
- Monitor user activity and error rates
- Verify all critical user flows work

#### **Hour 4-12: Regular Monitoring**  
- Check logs every 2 hours
- Monitor performance metrics
- Review security metrics

#### **Hour 12-24: Standard Monitoring**
- Check logs every 4 hours
- Daily security metrics review
- Confirm no degradation in user experience

### **Key Metrics to Monitor**

1. **Application Health**:
   ```sql
   -- Check for increased error rates
   SELECT 
     date_trunc('hour', created_at) as hour,
     count(*) as operations,
     count(*) filter (where error_message is not null) as errors
   FROM application_logs 
   WHERE created_at > now() - interval '24 hours'
   GROUP BY hour
   ORDER BY hour;
   ```

2. **Security Metrics**:
   ```sql
   -- Daily security summary
   SELECT get_security_metrics();
   
   -- Check for suspicious activity
   SELECT * FROM detect_suspicious_activity();
   ```

3. **Performance Metrics**:
   ```sql
   -- Check query performance
   SELECT 
     query,
     calls,
     mean_exec_time,
     max_exec_time
   FROM pg_stat_statements 
   WHERE query LIKE '%collages%' OR query LIKE '%photos%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

## Success Criteria

### **Security Implementation is Successful When**:
- ✅ All security policies are active and working
- ✅ Application functionality remains 100% intact
- ✅ No increase in application errors or timeouts
- ✅ Security metrics show proper access controls
- ✅ Audit logging captures all sensitive operations
- ✅ Rate limiting prevents abuse without affecting normal users

### **Red Flags (Immediate Investigation Required)**:
- ❌ Increase in 403/401 errors from legitimate users
- ❌ Application timeouts or performance degradation
- ❌ Users unable to perform normal operations
- ❌ Real-time updates stop working
- ❌ Subscription webhooks failing

## Support and Escalation

### **If Issues Arise**:

1. **Minor Issues**: Use gradual rollback for specific policies
2. **Major Issues**: Use emergency rollback procedures
3. **Critical Issues**: Contact database administrator immediately

### **Contact Information**:
- **Database Team**: [Your DB team contact]
- **Development Team**: [Your dev team contact]  
- **Security Team**: [Your security team contact]

### **Escalation Matrix**:
- **Level 1**: Application warnings or minor errors
- **Level 2**: User functionality impacted
- **Level 3**: Application down or data integrity issues

---

**Implementation Date**: January 16, 2025  
**Implemented By**: Database Security Specialist  
**Approved By**: [Approval required]  
**Status**: Ready for Production Deployment