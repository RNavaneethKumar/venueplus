-- ============================================================================
-- VenuePlus Seed Data — Governance (Users, Roles, Permissions, Venue)
-- ============================================================================
-- FunZone Family Entertainment Centre — Multi-type demo venue
-- ============================================================================

-- ── Fixed UUIDs for cross-referencing ────────────────────────────────────────

-- Users
\set uid_super   '''a0000000-0000-0000-0000-000000000001'''
\set uid_admin   '''a0000000-0000-0000-0000-000000000002'''
\set uid_mgr     '''a0000000-0000-0000-0000-000000000003'''
\set uid_cashier1 '''a0000000-0000-0000-0000-000000000004'''
\set uid_cashier2 '''a0000000-0000-0000-0000-000000000005'''
\set uid_gate1   '''a0000000-0000-0000-0000-000000000006'''
\set uid_gate2   '''a0000000-0000-0000-0000-000000000007'''
\set uid_reporter '''a0000000-0000-0000-0000-000000000008'''
\set uid_kds     '''a0000000-0000-0000-0000-000000000009'''
\set uid_retail  '''a0000000-0000-0000-0000-00000000000a'''

-- Roles
\set rid_super   '''b0000000-0000-0000-0000-000000000001'''
\set rid_vadmin  '''b0000000-0000-0000-0000-000000000002'''
\set rid_mgr     '''b0000000-0000-0000-0000-000000000003'''
\set rid_cashier '''b0000000-0000-0000-0000-000000000004'''
\set rid_gate    '''b0000000-0000-0000-0000-000000000005'''
\set rid_report  '''b0000000-0000-0000-0000-000000000006'''

-- Venue
\set vid '''c0000000-0000-0000-0000-000000000001'''

-- ── Users ────────────────────────────────────────────────────────────────────
-- PIN = 1234 for all demo users (bcrypt hash of '1234')

INSERT INTO users (id, username, display_name, pin_hash, mobile_number, email) VALUES
(:uid_super,   'superadmin',  'System Admin',     crypt('1234', gen_salt('bf')), '+919900000001', 'admin@funzone.in'),
(:uid_admin,   'venue_admin', 'Priya Sharma',     crypt('1234', gen_salt('bf')), '+919900000002', 'priya@funzone.in'),
(:uid_mgr,     'manager1',    'Rahul Verma',      crypt('1234', gen_salt('bf')), '+919900000003', 'rahul@funzone.in'),
(:uid_cashier1,'cashier1',    'Anita Desai',      crypt('1234', gen_salt('bf')), '+919900000004', NULL),
(:uid_cashier2,'cashier2',    'Vikram Singh',      crypt('1234', gen_salt('bf')), '+919900000005', NULL),
(:uid_gate1,   'gate1',       'Suresh Kumar',      crypt('1234', gen_salt('bf')), '+919900000006', NULL),
(:uid_gate2,   'gate2',       'Meena Patel',       crypt('1234', gen_salt('bf')), '+919900000007', NULL),
(:uid_reporter,'reporter1',   'Deepa Rao',         crypt('1234', gen_salt('bf')), '+919900000008', 'deepa@funzone.in'),
(:uid_kds,     'kitchen1',    'Raju Cook',         crypt('1234', gen_salt('bf')), '+919900000009', NULL),
(:uid_retail,  'retail1',     'Sania Merchant',    crypt('1234', gen_salt('bf')), '+919900000010', NULL);

-- ── Roles ────────────────────────────────────────────────────────────────────

INSERT INTO roles (id, name, description, scope_type) VALUES
(:rid_super,   'super_admin',      'Full system access',         'global'),
(:rid_vadmin,  'venue_admin',      'Full venue access',          'venue'),
(:rid_mgr,     'manager',          'Operational management',     'venue'),
(:rid_cashier, 'cashier',          'POS transactions only',      'venue'),
(:rid_gate,    'gate_operator',    'Entry scanning only',        'venue'),
(:rid_report,  'reporting_viewer', 'Reports, no transactions',   'venue');

-- ── Permissions ──────────────────────────────────────────────────────────────

INSERT INTO permissions (id, key, module, description, is_sensitive) VALUES
(uuid_generate_v4(), 'order.create',          'pos',       'Create orders',                false),
(uuid_generate_v4(), 'order.refund',           'pos',       'Process refunds',              true),
(uuid_generate_v4(), 'order.price_override',   'pos',       'Manual price override',        true),
(uuid_generate_v4(), 'order.void',             'pos',       'Void an order',                true),
(uuid_generate_v4(), 'gate.scan',              'gate',      'Scan tickets at gate',         false),
(uuid_generate_v4(), 'gate.manual_override',   'gate',      'Force gate entry',             true),
(uuid_generate_v4(), 'waiver.view',            'waiver',    'View waivers',                 false),
(uuid_generate_v4(), 'waiver.edit',            'waiver',    'Edit signed waivers',          true),
(uuid_generate_v4(), 'report.financial',       'reporting', 'Financial reports',            false),
(uuid_generate_v4(), 'report.operational',     'reporting', 'Operational reports',          false),
(uuid_generate_v4(), 'product.manage',         'admin',     'Manage products',              false),
(uuid_generate_v4(), 'inventory.manage',       'admin',     'Manage inventory',             false),
(uuid_generate_v4(), 'inventory.manual_adjust','admin',     'Manual inventory adjustment',  true),
(uuid_generate_v4(), 'membership.manage',      'admin',     'Manage memberships',           false),
(uuid_generate_v4(), 'customer.manage',        'crm',       'Manage customer records',      false),
(uuid_generate_v4(), 'campaign.manage',        'crm',       'Manage marketing campaigns',   false);

-- Assign all permissions to super_admin and venue_admin
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT :rid_super, id, true FROM permissions;

INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT :rid_vadmin, id, true FROM permissions;

-- Manager: all except waiver.edit
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT :rid_mgr, id, true FROM permissions WHERE key != 'waiver.edit';

-- Cashier: order.create only
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT :rid_cashier, id, true FROM permissions WHERE key IN ('order.create', 'waiver.view');

-- Gate: gate.scan only
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT :rid_gate, id, true FROM permissions WHERE key IN ('gate.scan', 'waiver.view');

-- Reporter: reports only
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT :rid_report, id, true FROM permissions WHERE key LIKE 'report.%';

-- ── Venue ────────────────────────────────────────────────────────────────────

INSERT INTO venues (id, name, legal_name, timezone, currency_code, country_code, tax_regime, tax_registration_number, registered_address, status, created_by) VALUES
(:vid, 'FunZone Family Entertainment Centre', 'FunZone Entertainment Pvt. Ltd.', 'Asia/Kolkata', 'INR', 'IN', 'GST', '29AABCF1234M1Z5', '42 MG Road, Bengaluru, Karnataka 560001', 'active', :uid_super);

-- ── User–Role Assignments ────────────────────────────────────────────────────

INSERT INTO user_roles (user_id, role_id, venue_id, assigned_by) VALUES
(:uid_super,    :rid_super,   NULL,  :uid_super),     -- global super admin
(:uid_admin,    :rid_vadmin,  :vid,  :uid_super),
(:uid_mgr,      :rid_mgr,    :vid,  :uid_admin),
(:uid_cashier1, :rid_cashier, :vid,  :uid_admin),
(:uid_cashier2, :rid_cashier, :vid,  :uid_admin),
(:uid_gate1,    :rid_gate,   :vid,  :uid_admin),
(:uid_gate2,    :rid_gate,   :vid,  :uid_admin),
(:uid_reporter, :rid_report, :vid,  :uid_admin),
(:uid_kds,      :rid_cashier,:vid,  :uid_admin),
(:uid_retail,   :rid_cashier,:vid,  :uid_admin);

-- ── Venue Feature Flags ──────────────────────────────────────────────────────

INSERT INTO venue_feature_flags (venue_id, feature_key, is_enabled, enabled_at) VALUES
(:vid, 'module.ticketing',   true,  now()),
(:vid, 'module.membership',  true,  now()),
(:vid, 'module.wallet',      true,  now()),
(:vid, 'module.gift_card',   true,  now()),
(:vid, 'module.redemption',  true,  now()),
(:vid, 'module.donations',   true,  now()),
(:vid, 'module.adoptions',   true,  now()),
(:vid, 'module.fnb',         true,  now()),
(:vid, 'module.retail',      true,  now()),
(:vid, 'module.crm',         true,  now()),
(:vid, 'module.waivers',     true,  now()),
(:vid, 'module.till',        true,  now());

-- ── Venue Settings ───────────────────────────────────────────────────────────

INSERT INTO venue_settings (venue_id, setting_key, setting_value, updated_by) VALUES
-- Payments
(:vid, 'payment.cash_enabled',             'true',    :uid_admin),
(:vid, 'payment.card_enabled',             'true',    :uid_admin),
(:vid, 'payment.upi_enabled',              'true',    :uid_admin),
(:vid, 'payment.wallet_enabled',           'true',    :uid_admin),
(:vid, 'payment.gift_card_enabled',        'true',    :uid_admin),
-- Till / Cash Management
(:vid, 'till_close_mode',                       'normal',    :uid_admin),  -- 'normal' | 'blind'
(:vid, 'pos.till_mode',                         'counter',   :uid_admin);  -- 'counter' | 'user'
