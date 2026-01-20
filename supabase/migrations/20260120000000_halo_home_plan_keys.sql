-- Halo Home plan keys + compatibility migration
-- Date: 2026-01-20
--
-- Goal:
-- - Add new plan keys used by Halo Home (explorer/pioneer/broker)
-- - Keep backward compatibility with older keys (seeker/sage) and migrate them forward
-- - Ensure monthly reset function includes the expanded set of subscription plan types

-- NOTE:
-- Supabase migrations run in a single transaction. Postgres requires enum
-- value additions to be committed before they can be referenced in UPDATEs
-- or function bodies. Therefore this migration ONLY adds enum values.
-- See the follow-up migration `20260120000001_halo_home_plan_key_data_migration.sql`
-- for data updates and function updates.

-- 1) Add enum values (idempotent)
ALTER TYPE ai_plan_type ADD VALUE IF NOT EXISTS 'seeker';
ALTER TYPE ai_plan_type ADD VALUE IF NOT EXISTS 'pioneer';
ALTER TYPE ai_plan_type ADD VALUE IF NOT EXISTS 'sage';
ALTER TYPE ai_plan_type ADD VALUE IF NOT EXISTS 'explorer';
ALTER TYPE ai_plan_type ADD VALUE IF NOT EXISTS 'broker';

