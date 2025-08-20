-- Board3 Database SQL Examples
-- This file contains example SQL queries for key database operations

-- ================================================================
-- USER MANAGEMENT QUERIES
-- ================================================================

-- Create a new user with organization membership
WITH new_user AS (
  INSERT INTO users (
    email, username, first_name, last_name, password_hash, 
    is_email_verified, timezone, preferences
  ) VALUES (
    'john.doe@company.com',
    'johndoe',
    'John',
    'Doe',
    '$2b$12$encrypted_password_hash_here',
    true,
    'America/New_York',
    '{"theme": "dark", "language": "en", "notifications": true}'::json
  ) RETURNING id, email
),
org_membership AS (
  INSERT INTO organization_members (user_id, org_id, role_id)
  SELECT 
    new_user.id,
    o.id,
    r.id
  FROM new_user
  CROSS JOIN organizations o
  CROSS JOIN roles r
  WHERE o.slug = 'board3-default' 
    AND r.name = 'Developer' 
    AND r.org_id = o.id
  RETURNING user_id
)
SELECT 'User created and added to organization' as result;

-- Get user with organization and role information
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.last_active_at,
  o.name as org_name,
  o.slug as org_slug,
  r.name as role_name,
  array_agg(
    json_build_object(
      'action', p.action,
      'resource', p.resource
    )
  ) as permissions
FROM users u
  JOIN organization_members om ON u.id = om.user_id
  JOIN organizations o ON om.org_id = o.id
  LEFT JOIN roles r ON om.role_id = r.id
  LEFT JOIN permissions p ON r.id = p.role_id
WHERE u.email = 'john.doe@company.com'
  AND u.is_active = true
GROUP BY u.id, u.email, u.first_name, u.last_name, u.last_active_at, 
         o.name, o.slug, r.name;

-- ================================================================
-- DESIGN AND TEMPLATE QUERIES
-- ================================================================

-- Get designs with template and creator information
SELECT 
  d.id,
  d.name,
  d.description,
  d.cloud_provider,
  d.status,
  d.version,
  d.estimated_cost,
  d.resource_count,
  d.created_at,
  d.updated_at,
  u.first_name || ' ' || u.last_name as creator_name,
  u.email as creator_email,
  t.name as template_name,
  t.category as template_category,
  o.name as organization_name
FROM designs d
  JOIN users u ON d.creator_id = u.id
  JOIN organizations o ON d.org_id = o.id
  LEFT JOIN templates t ON d.template_id = t.id
WHERE d.org_id = 'org-uuid-here'
  AND (d.is_public = true OR d.creator_id = 'current-user-uuid')
ORDER BY d.updated_at DESC
LIMIT 20;

-- Get popular templates with ratings
SELECT 
  t.id,
  t.name,
  t.description,
  t.category,
  t.cloud_provider,
  t.rating,
  t.rating_count,
  t.download_count,
  t.is_public,
  u.first_name || ' ' || u.last_name as creator_name,
  o.name as organization_name,
  COUNT(d.id) as usage_count
FROM templates t
  JOIN users u ON t.creator_id = u.id
  JOIN organizations o ON t.org_id = o.id
  LEFT JOIN designs d ON t.id = d.template_id
WHERE t.is_public = true
  AND t.cloud_provider = 'AWS'
GROUP BY t.id, t.name, t.description, t.category, t.cloud_provider,
         t.rating, t.rating_count, t.download_count, t.is_public,
         u.first_name, u.last_name, o.name
ORDER BY t.rating DESC NULLS LAST, t.download_count DESC
LIMIT 10;

-- ================================================================
-- PIPELINE AND STATE MANAGEMENT
-- ================================================================

-- Get pipeline executions with stages
SELECT 
  pe.id as execution_id,
  pe.status as execution_status,
  pe.started_at,
  pe.completed_at,
  pe.triggered_by,
  p.name as pipeline_name,
  d.name as design_name,
  json_agg(
    json_build_object(
      'stage_name', ps.name,
      'stage_type', ps.type,
      'status', ps.status,
      'duration', ps.duration,
      'order', ps.order
    ) ORDER BY ps.order
  ) as stages
FROM pipeline_executions pe
  JOIN pipelines p ON pe.pipeline_id = p.id
  JOIN designs d ON p.design_id = d.id
  LEFT JOIN pipeline_stages ps ON pe.id = ps.execution_id
WHERE pe.started_at >= NOW() - INTERVAL '7 days'
  AND p.org_id = 'org-uuid-here'
GROUP BY pe.id, pe.status, pe.started_at, pe.completed_at, 
         pe.triggered_by, p.name, d.name
ORDER BY pe.started_at DESC;

-- Get terraform state information with drift detection
SELECT 
  s.id,
  s.environment,
  s.backend_type,
  s.is_locked,
  s.locked_at,
  s.locked_by,
  s.last_plan_at,
  s.last_apply_at,
  s.drift_detected_at,
  s.drift_check_enabled,
  d.name as design_name,
  d.cloud_provider,
  COUNT(dl.id) as drift_count,
  COUNT(CASE WHEN dl.severity = 'CRITICAL' THEN 1 END) as critical_drifts,
  COUNT(CASE WHEN dl.is_resolved = false THEN 1 END) as unresolved_drifts
FROM states s
  JOIN designs d ON s.design_id = d.id
  LEFT JOIN drift_logs dl ON s.id = dl.state_id
WHERE s.org_id = 'org-uuid-here'
  AND s.drift_check_enabled = true
GROUP BY s.id, s.environment, s.backend_type, s.is_locked,
         s.locked_at, s.locked_by, s.last_plan_at, s.last_apply_at,
         s.drift_detected_at, s.drift_check_enabled, d.name, d.cloud_provider
ORDER BY s.drift_detected_at DESC NULLS LAST;

-- ================================================================
-- ANALYTICS AND REPORTING QUERIES
-- ================================================================

-- Organization dashboard statistics
SELECT 
  o.name as organization,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT d.id) as total_designs,
  COUNT(DISTINCT t.id) as total_templates,
  COUNT(DISTINCT p.id) as total_pipelines,
  COUNT(DISTINCT CASE WHEN d.status = 'DEPLOYED' THEN d.id END) as deployed_designs,
  COUNT(DISTINCT CASE WHEN pe.status = 'RUNNING' THEN pe.id END) as running_pipelines,
  SUM(d.estimated_cost) as total_estimated_cost,
  AVG(d.resource_count) as avg_resources_per_design
FROM organizations o
  LEFT JOIN organization_members om ON o.id = om.org_id AND om.is_active = true
  LEFT JOIN users u ON om.user_id = u.id AND u.is_active = true
  LEFT JOIN designs d ON o.id = d.org_id
  LEFT JOIN templates t ON o.id = t.org_id
  LEFT JOIN pipelines p ON o.id = p.org_id AND p.is_active = true
  LEFT JOIN pipeline_executions pe ON p.id = pe.pipeline_id 
    AND pe.started_at >= NOW() - INTERVAL '1 hour'
WHERE o.is_active = true
GROUP BY o.id, o.name
ORDER BY total_users DESC;

-- User activity and usage patterns
SELECT 
  u.id,
  u.email,
  u.first_name || ' ' || u.last_name as full_name,
  u.last_login_at,
  u.last_active_at,
  COUNT(DISTINCT d.id) as designs_created,
  COUNT(DISTINCT t.id) as templates_created,
  COUNT(DISTINCT pe.id) as pipelines_executed,
  COUNT(DISTINCT al.id) as total_actions,
  MAX(al.timestamp) as last_action
FROM users u
  LEFT JOIN designs d ON u.id = d.creator_id 
    AND d.created_at >= NOW() - INTERVAL '30 days'
  LEFT JOIN templates t ON u.id = t.creator_id 
    AND t.created_at >= NOW() - INTERVAL '30 days'
  LEFT JOIN pipeline_executions pe ON u.id::text = pe.triggered_by 
    AND pe.started_at >= NOW() - INTERVAL '30 days'
  LEFT JOIN audit_logs al ON u.id = al.user_id 
    AND al.timestamp >= NOW() - INTERVAL '30 days'
WHERE u.is_active = true
  AND u.last_active_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, u.first_name, u.last_name, 
         u.last_login_at, u.last_active_at
ORDER BY last_action DESC NULLS LAST;

-- ================================================================
-- SECURITY AND AUDIT QUERIES
-- ================================================================

-- Recent security-relevant activities
SELECT 
  al.id,
  al.action,
  al.resource,
  al.resource_id,
  al.timestamp,
  al.ip_address,
  u.email as user_email,
  u.first_name || ' ' || u.last_name as user_name,
  al.details
FROM audit_logs al
  LEFT JOIN users u ON al.user_id = u.id
WHERE al.timestamp >= NOW() - INTERVAL '24 hours'
  AND al.action IN ('LOGIN', 'LOGOUT', 'DELETE', 'DEPLOY', 'DESTROY')
ORDER BY al.timestamp DESC
LIMIT 100;

-- Active sessions and API keys
SELECT 
  'session' as type,
  s.user_id,
  u.email,
  s.created_at,
  s.updated_at,
  s.expires_at,
  CASE 
    WHEN s.expires_at > NOW() THEN 'active'
    ELSE 'expired'
  END as status
FROM sessions s
  JOIN users u ON s.user_id = u.id
WHERE s.expires_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'api_key' as type,
  ak.user_id,
  u.email,
  ak.created_at,
  ak.last_used_at as updated_at,
  ak.expires_at,
  CASE 
    WHEN ak.is_active = false THEN 'inactive'
    WHEN ak.expires_at IS NOT NULL AND ak.expires_at < NOW() THEN 'expired'
    ELSE 'active'
  END as status
FROM api_keys ak
  JOIN users u ON ak.user_id = u.id
WHERE ak.is_active = true
  OR ak.last_used_at > NOW() - INTERVAL '7 days'

ORDER BY created_at DESC;

-- ================================================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- ================================================================

-- Find designs with high resource counts that might need optimization
SELECT 
  d.id,
  d.name,
  d.cloud_provider,
  d.resource_count,
  d.estimated_cost,
  COUNT(r.id) as actual_resources,
  string_agg(DISTINCT r.type::text, ', ') as resource_types,
  d.updated_at
FROM designs d
  LEFT JOIN resources r ON d.id = r.design_id
WHERE d.resource_count > 50
  OR d.estimated_cost > 1000
GROUP BY d.id, d.name, d.cloud_provider, d.resource_count, 
         d.estimated_cost, d.updated_at
HAVING COUNT(r.id) != d.resource_count -- Inconsistent resource counts
ORDER BY d.estimated_cost DESC, d.resource_count DESC;

-- Database performance monitoring
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation,
  null_frac
FROM pg_stats 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'designs', 'templates', 'states', 'pipelines')
ORDER BY tablename, attname;

-- ================================================================
-- CLEANUP AND MAINTENANCE QUERIES
-- ================================================================

-- Clean up expired sessions
DELETE FROM sessions 
WHERE expires_at < NOW() - INTERVAL '1 day';

-- Clean up old audit logs (keep last 90 days)
DELETE FROM audit_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Clean up resolved drift logs older than 30 days
DELETE FROM drift_logs 
WHERE is_resolved = true 
  AND resolved_at < NOW() - INTERVAL '30 days';

-- Update user last_active_at based on recent audit activity
UPDATE users 
SET last_active_at = latest_activity.last_action
FROM (
  SELECT 
    user_id,
    MAX(timestamp) as last_action
  FROM audit_logs
  WHERE timestamp > NOW() - INTERVAL '1 hour'
  GROUP BY user_id
) latest_activity
WHERE users.id = latest_activity.user_id
  AND users.last_active_at < latest_activity.last_action;