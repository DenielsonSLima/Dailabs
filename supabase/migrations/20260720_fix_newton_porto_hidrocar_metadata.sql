-- Migration: backfill auth metadata from organization_membership
-- This migration keeps auth.users.raw_app_meta_data aligned with organization_members.

WITH org_names AS (
  SELECT
    o.id AS organization_id,
    NULLIF(BTRIM(COALESCE(o.nome_fantasia, o.razao_social)), '') AS company_name
  FROM public.organizations o
),
members AS (
  SELECT
    om.user_id,
    om.organization_id,
    en.company_name
  FROM public.organization_members om
  JOIN org_names en ON en.organization_id = om.organization_id
),
changes AS (
  SELECT
    m.user_id,
    m.organization_id,
    COALESCE(m.company_name, '') AS company_name
  FROM members m
)
UPDATE auth.users au
SET raw_app_meta_data = (
  COALESCE(au.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
      'organization_id', c.organization_id::text,
      'company_name', c.company_name
    )
)
FROM changes c
WHERE au.id = c.user_id
  AND (
    COALESCE(au.raw_app_meta_data->>'organization_id', '') <> c.organization_id::text
    OR COALESCE(au.raw_app_meta_data->>'company_name', '') <> c.company_name
  );
