-- ============================================================================
-- VenuePlus Seed Data — Till Management (Cash Drawers)
-- ============================================================================
-- FunZone Family Entertainment Centre — demo cash drawers
--
-- No cash_sessions or cash_movements are seeded — those are created at
-- runtime when a cashier opens a session via the POS.
-- ============================================================================

\set vid         '''c0000000-0000-0000-0000-000000000001'''
\set uid_admin   '''a0000000-0000-0000-0000-000000000002'''

-- ── Cash Drawers ──────────────────────────────────────────────────────────────
-- Three named counters for FunZone.  In 'counter' mode (pos.till_mode = 'counter')
-- each cashier opens a session against one of these drawers before processing sales.
-- In 'user' mode the drawer_id is NULL and sessions are scoped to the user instead.

\set drawer_main    '''f1000000-0000-0000-0000-000000000001'''
\set drawer_counter2 '''f1000000-0000-0000-0000-000000000002'''
\set drawer_fnb     '''f1000000-0000-0000-0000-000000000003'''

INSERT INTO cash_drawers (id, venue_id, name, description, is_active, created_by) VALUES
(:drawer_main,     :vid, 'Main Counter',    'Primary ticket & admission counter at the entrance',   true, :uid_admin),
(:drawer_counter2, :vid, 'Counter 2',       'Secondary counter — peak-hour overflow',                true, :uid_admin),
(:drawer_fnb,      :vid, 'F&B Counter',     'Food & beverage point-of-sale near the food court',    true, :uid_admin);
