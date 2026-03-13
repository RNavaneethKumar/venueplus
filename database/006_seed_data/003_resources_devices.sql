-- ============================================================================
-- VenuePlus Seed Data — Resources, Slots, Devices
-- ============================================================================

\set vid '''c0000000-0000-0000-0000-000000000001'''
\set uid_admin '''a0000000-0000-0000-0000-000000000002'''

-- ── Resources ────────────────────────────────────────────────────────────────

\set res_jump    '''e1000000-0000-0000-0000-000000000001'''
\set res_laser   '''e1000000-0000-0000-0000-000000000002'''
\set res_escape  '''e1000000-0000-0000-0000-000000000003'''
\set res_arcade  '''e1000000-0000-0000-0000-000000000004'''
\set res_softplay '''e1000000-0000-0000-0000-000000000005'''
\set res_zoo     '''e1000000-0000-0000-0000-000000000006'''
\set res_waterslide '''e1000000-0000-0000-0000-000000000007'''
\set res_wavepool '''e1000000-0000-0000-0000-000000000008'''

INSERT INTO resources (id, venue_id, name, description, admission_mode, capacity_enforcement_type, capacity, created_by) VALUES
(:res_jump,       :vid, 'Jump Arena',       'Main trampoline floor',           'rolling_duration', 'hard', 50,   :uid_admin),
(:res_laser,      :vid, 'Laser Tag Room',   'Dark room laser tag',             'slot_based',       'hard', 12,   :uid_admin),
(:res_escape,     :vid, 'Escape Room',      'Mystery Manor themed escape',     'slot_based',       'hard', 6,    :uid_admin),
(:res_arcade,     :vid, 'Arcade Floor',     'Arcade games and redemption',     'open_access',      'soft', NULL, :uid_admin),
(:res_softplay,   :vid, 'Soft Play Zone',   'Toddler and child soft play',     'rolling_duration', 'hard', 30,   :uid_admin),
(:res_zoo,        :vid, 'Mini Zoo',         'Petting zoo and animal exhibits', 'open_access',      'soft', NULL, :uid_admin),
(:res_waterslide, :vid, 'Water Slides',     'Splash zone water slides',        'rolling_duration', 'hard', 40,   :uid_admin),
(:res_wavepool,   :vid, 'Wave Pool',        'Wave pool with lazy river',       'open_access',      'hard', 100,  :uid_admin);

-- ── Slot Templates (Laser Tag & Escape Room) ─────────────────────────────────

\set st_laser1 '''e2000000-0000-0000-0000-000000000001'''
\set st_escape1 '''e2000000-0000-0000-0000-000000000002'''

INSERT INTO resource_slot_templates (id, resource_id, version, name, start_time, end_time, slot_duration_minutes, recurrence_type, days_of_week, effective_from, created_by) VALUES
(:st_laser1,  :res_laser,  1, 'Laser Tag Daily', '10:00', '21:00', 30, 'daily', NULL, '2026-01-01', :uid_admin),
(:st_escape1, :res_escape, 1, 'Escape Room Daily', '10:00', '20:00', 60, 'daily', NULL, '2026-01-01', :uid_admin);

-- ── Generate slots for today and next 7 days ─────────────────────────────────

-- Laser Tag: 30-min slots from 10:00 to 21:00 = 22 slots/day
INSERT INTO resource_slots (resource_id, slot_template_id, slot_template_version, slot_date, start_time, end_time, created_by)
SELECT
    :res_laser,
    :st_laser1,
    1,
    d::DATE,
    (TIME '10:00' + (s * INTERVAL '30 minutes'))::TIME,
    (TIME '10:00' + ((s + 1) * INTERVAL '30 minutes'))::TIME,
    :uid_admin
FROM generate_series(CURRENT_DATE, CURRENT_DATE + 7, '1 day') AS d,
     generate_series(0, 21) AS s;

-- Escape Room: 60-min slots from 10:00 to 20:00 = 10 slots/day
INSERT INTO resource_slots (resource_id, slot_template_id, slot_template_version, slot_date, start_time, end_time, created_by)
SELECT
    :res_escape,
    :st_escape1,
    1,
    d::DATE,
    (TIME '10:00' + (s * INTERVAL '60 minutes'))::TIME,
    (TIME '10:00' + ((s + 1) * INTERVAL '60 minutes'))::TIME,
    :uid_admin
FROM generate_series(CURRENT_DATE, CURRENT_DATE + 7, '1 day') AS d,
     generate_series(0, 9) AS s;

-- ── Devices ──────────────────────────────────────────────────────────────────

\set dev_pos1   '''e3000000-0000-0000-0000-000000000001'''
\set dev_pos2   '''e3000000-0000-0000-0000-000000000002'''
\set dev_kiosk1 '''e3000000-0000-0000-0000-000000000003'''
\set dev_kiosk2 '''e3000000-0000-0000-0000-000000000004'''
\set dev_gate1  '''e3000000-0000-0000-0000-000000000005'''
\set dev_gate2  '''e3000000-0000-0000-0000-000000000006'''
\set dev_gate3  '''e3000000-0000-0000-0000-000000000007'''
\set dev_kds1   '''e3000000-0000-0000-0000-000000000008'''
\set dev_kds2   '''e3000000-0000-0000-0000-000000000009'''
\set dev_arcade '''e3000000-0000-0000-0000-00000000000a'''

INSERT INTO devices (id, venue_id, name, device_type, identifier, status, created_by) VALUES
(:dev_pos1,   :vid, 'POS Counter 1',       'pos',           'POS-001',   'active', :uid_admin),
(:dev_pos2,   :vid, 'POS Counter 2',       'pos',           'POS-002',   'active', :uid_admin),
(:dev_kiosk1, :vid, 'Lobby Kiosk 1',       'kiosk',         'KIOSK-001', 'active', :uid_admin),
(:dev_kiosk2, :vid, 'Lobby Kiosk 2',       'kiosk',         'KIOSK-002', 'active', :uid_admin),
(:dev_gate1,  :vid, 'Main Entrance Gate',  'gate',          'GATE-001',  'active', :uid_admin),
(:dev_gate2,  :vid, 'Jump Arena Gate',     'gate',          'GATE-002',  'active', :uid_admin),
(:dev_gate3,  :vid, 'Water Zone Gate',     'gate',          'GATE-003',  'active', :uid_admin),
(:dev_kds1,   :vid, 'Kitchen Display 1',   'kds',           'KDS-001',   'active', :uid_admin),
(:dev_kds2,   :vid, 'Kitchen Display 2',   'kds',           'KDS-002',   'active', :uid_admin),
(:dev_arcade, :vid, 'Arcade Card Reader',  'arcade_reader', 'ARC-001',   'active', :uid_admin);

-- ── Device–Resource Mapping (gates → resources) ──────────────────────────────

INSERT INTO device_resource_mapping (device_id, resource_id, is_entry_point, is_exit_point, created_by) VALUES
(:dev_gate1, :res_jump,       true, true, :uid_admin),
(:dev_gate1, :res_laser,      true, false, :uid_admin),
(:dev_gate1, :res_escape,     true, false, :uid_admin),
(:dev_gate1, :res_softplay,   true, true, :uid_admin),
(:dev_gate1, :res_zoo,        true, false, :uid_admin),
(:dev_gate2, :res_jump,       true, true, :uid_admin),
(:dev_gate3, :res_waterslide, true, true, :uid_admin),
(:dev_gate3, :res_wavepool,   true, true, :uid_admin);
