-- =========================================================
-- 07_seed.sql
-- =========================================================
-- Reference data: roles, atomic permissions, and default
-- federal-level policy groups.
--
-- Safe to re-run (ON CONFLICT DO NOTHING everywhere).
-- =========================================================


-- ═══════════════════════════════════════════════════════════
-- ROLES (identity classification — NOT access control)
-- ═══════════════════════════════════════════════════════════

insert into roles (id, display_name, description) values
  ('PASSENGER',      'Passenger',       'Default user role for riders'),
  ('DRIVER',         'Driver',          'Vehicle operator'),
  ('CONDUCTOR',      'Conductor',       'On-vehicle staff'),
  ('OWNER',          'Owner',           'Vehicle owner'),
  ('ORGANIZATION',   'Organization',    'Sacco / cooperative admin'),
  ('STAGE_OPERATOR', 'Stage Operator',  'Stage management'),
  ('REGULATOR',      'Regulator',       'Read-only / audit access'),
  ('PLANNER',        'Planner',         'Data consumer'),
  ('ADMIN',          'Admin',           'Platform administrator'),
  -- Required by current_user_is_platform_admin() / current_user_manages_profile()
  -- in 03_functions.sql (used by the recursion-safe profiles RLS policies
  -- in 06_rls.sql). Without these rows, actors.type's FK to roles(id)
  -- means no actor could ever be assigned these types, and both
  -- functions would permanently match nobody — not a data bug, but
  -- confirm your onboarding/admin-assignment flow actually grants
  -- these types before relying on them.
  ('SUPER_ADMIN',        'Super Admin',        'Platform super administrator (federal)'),
  ('GENERAL_MANAGER',    'General Manager',    'Org-level manager'),
  ('FLEET_MANAGER',      'Fleet Manager',      'Org-level fleet manager'),
  ('OPERATIONS_MANAGER', 'Operations Manager', 'Org-level operations manager'),
  ('BRANCH_MANAGER',     'Branch Manager',     'Branch-level manager'),
  ('ORG_CHAIR',          'Org Chair',          'Org-level chairperson')
on conflict do nothing;


-- ═══════════════════════════════════════════════════════════
-- PERMISSIONS CATALOG (atomic actions)
-- ═══════════════════════════════════════════════════════════

insert into permissions (action, description, federal_only) values
  -- Vehicles
  ('vehicle.view',        'View vehicle details',                false),
  ('vehicle.create',      'Register a new vehicle',              false),
  ('vehicle.update',      'Edit vehicle details',                false),
  ('vehicle.delete',      'Remove a vehicle',                    false),
  ('vehicle.assign',      'Assign driver/conductor to vehicle',  false),
  ('vehicle.transfer',    'Transfer vehicle between orgs',       false),

  -- Bookings
  ('booking.view',        'View booking details',                false),
  ('booking.create',      'Create a booking on behalf',          false),
  ('booking.modify',      'Modify an existing booking',          false),
  ('booking.cancel',      'Cancel a booking',                    false),

  -- Organization
  ('org.view',            'View organization details',           false),
  ('org.create',          'Create a new organization',           true),
  ('org.manage',          'Manage org settings & members',       false),
  ('org.invite',          'Send invites for this org',           false),
  ('org.delete',          'Delete an organization',              true),

  -- Stage
  ('stage.view',          'View stage assignments',              false),
  ('stage.manage',        'Manage stage routes and vehicles',    false),

  -- Compliance
  ('compliance.view',     'View compliance events',              false),
  ('compliance.create',   'Create compliance event',             false),
  ('compliance.resolve',  'Mark compliance event resolved',      false),

  -- Reconciliation
  ('reconciliation.view',    'View reconciliation data',         false),
  ('reconciliation.create',  'Create reconciliation event',      false),
  ('reconciliation.approve', 'Approve reconciliation',           false),

  -- Audit
  ('audit.view',          'View audit logs',                     false),

  -- Administration (federal-only)
  ('admin.full',          'Full platform administration',        true),
  ('admin.users',         'Manage user accounts',                true),
  ('admin.roles',         'Manage role assignments',             true),
  ('admin.permissions',   'Manage permission grants',            true),

  -- Delegation
  ('delegation.grant',    'Delegate own permissions to others',  false),
  ('delegation.revoke',   'Revoke delegated permissions',        false)
on conflict (action) do nothing;


-- ═══════════════════════════════════════════════════════════
-- DEFAULT FEDERAL POLICY GROUPS
-- ═══════════════════════════════════════════════════════════
-- These are templates. Org-scoped groups are created per-org
-- (by the invite flow or admin tooling).

-- Platform Admin
insert into policy_groups (name, organization_id, description) values
  ('Platform Admin', null, 'Full platform access — federal scope')
on conflict do nothing;

insert into policy_group_permissions (group_id, permission_id, effect)
select pg.id, p.id, 'allow'
from policy_groups pg
cross join permissions p
where pg.name = 'Platform Admin'
  and pg.organization_id is null
on conflict do nothing;

-- Regulator (read-only)
insert into policy_groups (name, organization_id, description) values
  ('Regulator', null, 'Read-only audit access — federal scope')
on conflict do nothing;

insert into policy_group_permissions (group_id, permission_id, effect)
select pg.id, p.id, 'allow'
from policy_groups pg
cross join permissions p
where pg.name = 'Regulator'
  and pg.organization_id is null
  and p.action in (
    'vehicle.view', 'booking.view', 'org.view', 'stage.view',
    'compliance.view', 'reconciliation.view', 'audit.view'
  )
on conflict do nothing;

-- Planner (data consumer)
insert into policy_groups (name, organization_id, description) values
  ('Planner', null, 'Analytics and planning data — federal scope')
on conflict do nothing;

insert into policy_group_permissions (group_id, permission_id, effect)
select pg.id, p.id, 'allow'
from policy_groups pg
cross join permissions p
where pg.name = 'Planner'
  and pg.organization_id is null
  and p.action in (
    'vehicle.view', 'booking.view', 'org.view',
    'stage.view', 'reconciliation.view'
  )
on conflict do nothing;


-- ═══════════════════════════════════════════════════════════
-- TEMPLATE: DEFAULT ORG-SCOPED POLICY GROUPS
-- ═══════════════════════════════════════════════════════════
-- These are NOT inserted here because they require an org ID.
-- Use this function to bootstrap groups for a new organization.

create or replace function public.create_default_org_policy_groups(
  p_org_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  grp_id uuid;
begin
  -- Default DRIVER
  insert into policy_groups (name, organization_id, description)
  values ('Default DRIVER', p_org_id, 'Standard driver permissions')
  returning id into grp_id;

  insert into policy_group_permissions (group_id, permission_id, effect)
  select grp_id, p.id, 'allow'
  from permissions p
  where p.action in ('vehicle.view', 'booking.view', 'stage.view');

  -- Default CONDUCTOR
  insert into policy_groups (name, organization_id, description)
  values ('Default CONDUCTOR', p_org_id, 'Standard conductor permissions')
  returning id into grp_id;

  insert into policy_group_permissions (group_id, permission_id, effect)
  select grp_id, p.id, 'allow'
  from permissions p
  where p.action in ('vehicle.view', 'booking.view', 'booking.create',
                     'booking.modify', 'reconciliation.create', 'stage.view');

  -- Default OWNER
  insert into policy_groups (name, organization_id, description)
  values ('Default OWNER', p_org_id, 'Vehicle owner permissions')
  returning id into grp_id;

  insert into policy_group_permissions (group_id, permission_id, effect)
  select grp_id, p.id, 'allow'
  from permissions p
  where p.action in ('vehicle.view', 'vehicle.update', 'vehicle.assign',
                     'booking.view', 'compliance.view', 'reconciliation.view');

  -- Default ORGANIZATION (org admin)
  insert into policy_groups (name, organization_id, description)
  values ('Default ORGANIZATION', p_org_id, 'Organization administrator')
  returning id into grp_id;

  insert into policy_group_permissions (group_id, permission_id, effect)
  select grp_id, p.id, 'allow'
  from permissions p
  where p.action in (
    'vehicle.view', 'vehicle.create', 'vehicle.update', 'vehicle.delete',
    'vehicle.assign', 'booking.view', 'booking.create', 'booking.modify',
    'booking.cancel', 'org.view', 'org.manage', 'org.invite',
    'stage.view', 'stage.manage', 'compliance.view', 'compliance.create',
    'compliance.resolve', 'reconciliation.view', 'reconciliation.create',
    'reconciliation.approve', 'audit.view', 'delegation.grant', 'delegation.revoke'
  );

  -- Default STAGE_OPERATOR
  insert into policy_groups (name, organization_id, description)
  values ('Default STAGE_OPERATOR', p_org_id, 'Stage operator permissions')
  returning id into grp_id;

  insert into policy_group_permissions (group_id, permission_id, effect)
  select grp_id, p.id, 'allow'
  from permissions p
  where p.action in ('vehicle.view', 'booking.view', 'stage.view',
                     'stage.manage', 'reconciliation.view');
end;
$$;
