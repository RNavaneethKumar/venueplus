-- ============================================================================
-- VenuePlus Seed Data — Customers, Persons, Waivers
-- ============================================================================

\set vid '''c0000000-0000-0000-0000-000000000001'''
\set uid_admin '''a0000000-0000-0000-0000-000000000002'''
\set uid_cashier1 '''a0000000-0000-0000-0000-000000000004'''

-- ── Accounts (50 customers) ──────────────────────────────────────────────────

\set acc01 '''aa000000-0000-0000-0000-000000000001'''
\set acc02 '''aa000000-0000-0000-0000-000000000002'''
\set acc03 '''aa000000-0000-0000-0000-000000000003'''
\set acc04 '''aa000000-0000-0000-0000-000000000004'''
\set acc05 '''aa000000-0000-0000-0000-000000000005'''
\set acc06 '''aa000000-0000-0000-0000-000000000006'''
\set acc07 '''aa000000-0000-0000-0000-000000000007'''
\set acc08 '''aa000000-0000-0000-0000-000000000008'''
\set acc09 '''aa000000-0000-0000-0000-000000000009'''
\set acc10 '''aa000000-0000-0000-0000-000000000010'''

INSERT INTO accounts (id, venue_id, email, mobile_number, display_name, auth_provider, is_verified) VALUES
(:acc01, :vid, 'rajesh.kumar@gmail.com',    '+919800000001', 'Rajesh Kumar',      'mobile', true),
(:acc02, :vid, 'priya.nair@gmail.com',      '+919800000002', 'Priya Nair',        'mobile', true),
(:acc03, :vid, 'amit.patel@yahoo.com',      '+919800000003', 'Amit Patel',        'email',  true),
(:acc04, :vid, 'sneha.reddy@gmail.com',     '+919800000004', 'Sneha Reddy',       'mobile', true),
(:acc05, :vid, 'vikram.joshi@outlook.com',  '+919800000005', 'Vikram Joshi',      'email',  true),
(:acc06, :vid, 'meera.iyer@gmail.com',      '+919800000006', 'Meera Iyer',        'google', true),
(:acc07, :vid, 'arjun.sharma@gmail.com',    '+919800000007', 'Arjun Sharma',      'mobile', true),
(:acc08, :vid, 'divya.gupta@gmail.com',     '+919800000008', 'Divya Gupta',       'mobile', true),
(:acc09, :vid, 'karthik.menon@gmail.com',   '+919800000009', 'Karthik Menon',     'apple',  true),
(:acc10, :vid, 'ananya.das@gmail.com',      '+919800000010', 'Ananya Das',        'mobile', true);

-- Additional 40 accounts via generate_series
INSERT INTO accounts (venue_id, email, mobile_number, display_name, auth_provider, is_verified)
SELECT
    :vid,
    'customer' || s || '@demo.funzone.in',
    '+91980000' || lpad(s::TEXT, 4, '0'),
    'Demo Customer ' || s,
    'mobile',
    true
FROM generate_series(11, 50) AS s;

-- ── Persons (primary self + family members for key accounts) ─────────────────

\set per01 '''ab000000-0000-0000-0000-000000000001'''
\set per02 '''ab000000-0000-0000-0000-000000000002'''
\set per03 '''ab000000-0000-0000-0000-000000000003'''
\set per04 '''ab000000-0000-0000-0000-000000000004'''
\set per05 '''ab000000-0000-0000-0000-000000000005'''
\set per06 '''ab000000-0000-0000-0000-000000000006'''
\set per07 '''ab000000-0000-0000-0000-000000000007'''
\set per08 '''ab000000-0000-0000-0000-000000000008'''
\set per09 '''ab000000-0000-0000-0000-000000000009'''
\set per10 '''ab000000-0000-0000-0000-000000000010'''
-- Family members for Rajesh (acc01)
\set per01_kid1 '''ab000000-0000-0000-0000-000000000011'''
\set per01_kid2 '''ab000000-0000-0000-0000-000000000012'''
\set per01_spouse '''ab000000-0000-0000-0000-000000000013'''
-- Family for Priya (acc02)
\set per02_kid1 '''ab000000-0000-0000-0000-000000000014'''

INSERT INTO persons (id, venue_id, first_name, last_name, date_of_birth, is_minor, gender) VALUES
-- Primary persons (self)
(:per01, :vid, 'Rajesh',  'Kumar',  '1985-03-15', false, 'male'),
(:per02, :vid, 'Priya',   'Nair',   '1990-07-22', false, 'female'),
(:per03, :vid, 'Amit',    'Patel',  '1988-11-05', false, 'male'),
(:per04, :vid, 'Sneha',   'Reddy',  '1992-01-18', false, 'female'),
(:per05, :vid, 'Vikram',  'Joshi',  '1980-06-30', false, 'male'),
(:per06, :vid, 'Meera',   'Iyer',   '1995-09-12', false, 'female'),
(:per07, :vid, 'Arjun',   'Sharma', '1987-04-25', false, 'male'),
(:per08, :vid, 'Divya',   'Gupta',  '1993-12-08', false, 'female'),
(:per09, :vid, 'Karthik', 'Menon',  '1982-08-14', false, 'male'),
(:per10, :vid, 'Ananya',  'Das',    '1991-02-28', false, 'female'),
-- Rajesh's family
(:per01_kid1,   :vid, 'Aarav',  'Kumar', '2016-05-10', true,  'male'),
(:per01_kid2,   :vid, 'Anvi',   'Kumar', '2019-08-20', true,  'female'),
(:per01_spouse, :vid, 'Sunita', 'Kumar', '1987-11-03', false, 'female'),
-- Priya's child
(:per02_kid1,   :vid, 'Rohan',  'Nair',  '2017-03-14', true,  'male');

-- Auto-create persons for remaining accounts
INSERT INTO persons (venue_id, first_name, last_name, is_minor)
SELECT :vid, 'Demo', 'Person ' || s, false
FROM generate_series(11, 50) AS s;

-- ── Account–Person Relationships ─────────────────────────────────────────────

INSERT INTO account_persons (account_id, person_id, relationship, is_primary, can_manage) VALUES
(:acc01, :per01,        'self',  true,  true),
(:acc01, :per01_kid1,   'child', false, true),
(:acc01, :per01_kid2,   'child', false, true),
(:acc01, :per01_spouse, 'spouse',false, true),
(:acc02, :per02,        'self',  true,  true),
(:acc02, :per02_kid1,   'child', false, true),
(:acc03, :per03,        'self',  true,  true),
(:acc04, :per04,        'self',  true,  true),
(:acc05, :per05,        'self',  true,  true),
(:acc06, :per06,        'self',  true,  true),
(:acc07, :per07,        'self',  true,  true),
(:acc08, :per08,        'self',  true,  true),
(:acc09, :per09,        'self',  true,  true),
(:acc10, :per10,        'self',  true,  true);

-- Auto-link remaining accounts to their persons
INSERT INTO account_persons (account_id, person_id, relationship, is_primary, can_manage)
SELECT a.id, p.id, 'self', true, true
FROM accounts a
JOIN persons p ON p.first_name = 'Demo' AND p.last_name = 'Person ' || SUBSTRING(a.email FROM 'customer(\d+)')
WHERE a.email LIKE 'customer%@demo.funzone.in';

-- ── Waiver Template ──────────────────────────────────────────────────────────

\set wt1 '''ac000000-0000-0000-0000-000000000001'''

INSERT INTO waiver_templates (id, venue_id, name, version, content_html, effective_from, created_by) VALUES
(:wt1, :vid, 'General Activity Waiver', 1,
'<h2>FunZone Activity Waiver & Release of Liability</h2>
<p>I acknowledge that participation in activities at FunZone Family Entertainment Centre involves inherent risks including but not limited to physical injury. I voluntarily assume all risks and release FunZone Entertainment Pvt. Ltd. from any liability.</p>
<p>I confirm that all participants listed are in good health and have no medical conditions that would prevent safe participation.</p>
<p>For minor participants: I am the parent/legal guardian and give consent for the named minor(s) to participate.</p>',
'2026-01-01', :uid_admin);

-- Map waiver to ticket products that require it
INSERT INTO product_waiver_mapping (product_id, waiver_template_id)
SELECT prc.product_id, :wt1
FROM product_reservation_config prc
WHERE prc.requires_waiver = true;

-- ── Waiver Signatures (for key accounts) ─────────────────────────────────────

INSERT INTO waiver_signatures (waiver_template_id, waiver_template_version, signed_by_account_id, signature_data, ip_address, user_agent, otp_verified) VALUES
(:wt1, 1, :acc01, 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', '203.0.113.10', 'Mozilla/5.0 (Android)', true),
(:wt1, 1, :acc02, 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', '203.0.113.11', 'Mozilla/5.0 (iPhone)',  true),
(:wt1, 1, :acc03, 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', '203.0.113.12', 'Mozilla/5.0 (Android)', true),
(:wt1, 1, :acc04, 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', '203.0.113.13', 'Mozilla/5.0 (iPhone)',  true),
(:wt1, 1, :acc05, 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', '203.0.113.14', 'Mozilla/5.0 (Windows)', true);

-- Link signatures to persons
-- Note: ::uuid casts are required here because \set variables expand as text
-- literals, and PostgreSQL does not implicitly coerce text → uuid inside SELECT.
INSERT INTO waiver_signature_persons (waiver_signature_id, person_id, is_self)
SELECT ws.id, :per01::uuid,        true  FROM waiver_signatures ws WHERE ws.signed_by_account_id = :acc01::uuid
UNION ALL
SELECT ws.id, :per01_kid1::uuid,   false FROM waiver_signatures ws WHERE ws.signed_by_account_id = :acc01::uuid
UNION ALL
SELECT ws.id, :per01_kid2::uuid,   false FROM waiver_signatures ws WHERE ws.signed_by_account_id = :acc01::uuid
UNION ALL
SELECT ws.id, :per01_spouse::uuid, false FROM waiver_signatures ws WHERE ws.signed_by_account_id = :acc01::uuid
UNION ALL
SELECT ws.id, :per02::uuid,        true  FROM waiver_signatures ws WHERE ws.signed_by_account_id = :acc02::uuid
UNION ALL
SELECT ws.id, :per02_kid1::uuid,   false FROM waiver_signatures ws WHERE ws.signed_by_account_id = :acc02::uuid
UNION ALL
SELECT ws.id, :per03::uuid,        true  FROM waiver_signatures ws WHERE ws.signed_by_account_id = :acc03::uuid
UNION ALL
SELECT ws.id, :per04::uuid,        true  FROM waiver_signatures ws WHERE ws.signed_by_account_id = :acc04::uuid
UNION ALL
SELECT ws.id, :per05::uuid,        true  FROM waiver_signatures ws WHERE ws.signed_by_account_id = :acc05::uuid;
