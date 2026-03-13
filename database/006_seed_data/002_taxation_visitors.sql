-- ============================================================================
-- VenuePlus Seed Data — Taxation & Visitor Types
-- ============================================================================

\set vid '''c0000000-0000-0000-0000-000000000001'''
\set uid_admin '''a0000000-0000-0000-0000-000000000002'''

-- ── Tax Components ───────────────────────────────────────────────────────────

\set tc_cgst '''d1000000-0000-0000-0000-000000000001'''
\set tc_sgst '''d1000000-0000-0000-0000-000000000002'''
\set tc_igst '''d1000000-0000-0000-0000-000000000003'''

INSERT INTO tax_components (id, code, name) VALUES
(:tc_cgst, 'cgst', 'Central GST'),
(:tc_sgst, 'sgst', 'State GST'),
(:tc_igst, 'igst', 'Integrated GST');

-- ── Tax Structures ───────────────────────────────────────────────────────────

\set ts_gst18 '''d2000000-0000-0000-0000-000000000001'''
\set ts_gst12 '''d2000000-0000-0000-0000-000000000002'''
\set ts_gst5  '''d2000000-0000-0000-0000-000000000003'''
\set ts_gst0  '''d2000000-0000-0000-0000-000000000004'''

INSERT INTO tax_structures (id, venue_id, name, code, created_by) VALUES
(:ts_gst18, :vid, 'GST 18%', 'gst_18', :uid_admin),
(:ts_gst12, :vid, 'GST 12%', 'gst_12', :uid_admin),
(:ts_gst5,  :vid, 'GST 5%',  'gst_5',  :uid_admin),
(:ts_gst0,  :vid, 'GST 0%',  'gst_0',  :uid_admin);

INSERT INTO tax_structure_components (tax_structure_id, tax_component_id, tax_rate_percent) VALUES
(:ts_gst18, :tc_cgst, 9.00),
(:ts_gst18, :tc_sgst, 9.00),
(:ts_gst12, :tc_cgst, 6.00),
(:ts_gst12, :tc_sgst, 6.00),
(:ts_gst5,  :tc_cgst, 2.50),
(:ts_gst5,  :tc_sgst, 2.50);

-- ── Visitor Types ────────────────────────────────────────────────────────────

\set vt_adult    '''d3000000-0000-0000-0000-000000000001'''
\set vt_child    '''d3000000-0000-0000-0000-000000000002'''
\set vt_senior   '''d3000000-0000-0000-0000-000000000003'''
\set vt_toddler  '''d3000000-0000-0000-0000-000000000004'''
\set vt_spectator '''d3000000-0000-0000-0000-000000000005'''

INSERT INTO visitor_types (id, venue_id, name, code, description, is_minor, requires_waiver, created_by) VALUES
(:vt_adult,     :vid, 'Adult',     'adult',     'Ages 13+',              false, true,  :uid_admin),
(:vt_child,     :vid, 'Child',     'child',     'Ages 4–12',             true,  true,  :uid_admin),
(:vt_senior,    :vid, 'Senior',    'senior',    'Ages 60+',              false, true,  :uid_admin),
(:vt_toddler,   :vid, 'Toddler',  'toddler',   'Ages 1–3',             true,  true,  :uid_admin),
(:vt_spectator, :vid, 'Spectator', 'spectator', 'Non-participating',     false, false, :uid_admin);
