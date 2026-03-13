-- ============================================================================
-- VenuePlus Database Setup — Step 5: Functions
-- ============================================================================
-- Utility functions: settings helper, capacity calculation, order numbering,
-- and hold expiry cleanup.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Venue Settings Helper
--    Returns the setting value for a venue/key, falling back to a provided
--    default if the key is not set for that venue.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_venue_setting(
    p_venue_id   UUID,
    p_key        TEXT,
    p_default    JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT setting_value INTO v_value
    FROM venue_settings
    WHERE venue_id = p_venue_id AND setting_key = p_key;

    RETURN COALESCE(v_value, p_default);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Available Capacity for a Resource Slot
--    Derives available capacity = slot capacity - confirmed reservations - active holds
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_slot_available_capacity(
    p_resource_slot_id UUID
)
RETURNS INT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_slot_capacity     INT;
    v_resource_capacity INT;
    v_confirmed         INT;
    v_held              INT;
    v_effective_cap     INT;
BEGIN
    -- Get slot and resource capacity
    SELECT
        COALESCE(rs.capacity, r.capacity),
        r.capacity
    INTO v_effective_cap, v_resource_capacity
    FROM resource_slots rs
    JOIN resources r ON r.id = rs.resource_id
    WHERE rs.id = p_resource_slot_id;

    IF v_effective_cap IS NULL THEN
        RETURN NULL;  -- soft capacity, no limit
    END IF;

    -- Count confirmed reservations
    SELECT COALESCE(SUM(1), 0) INTO v_confirmed
    FROM reservations
    WHERE resource_slot_id = p_resource_slot_id
      AND status = 'confirmed';

    -- Count active holds (not expired)
    SELECT COALESCE(SUM(quantity), 0) INTO v_held
    FROM capacity_holds
    WHERE resource_slot_id = p_resource_slot_id
      AND status = 'active'
      AND expires_at > now();

    RETURN GREATEST(v_effective_cap - v_confirmed - v_held, 0);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Available Capacity for Rolling Duration / Open Access Resources
--    For a given resource and time window.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_resource_available_capacity(
    p_resource_id   UUID,
    p_from          TIMESTAMPTZ,
    p_until         TIMESTAMPTZ
)
RETURNS INT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_capacity  INT;
    v_confirmed INT;
    v_held      INT;
BEGIN
    SELECT capacity INTO v_capacity
    FROM resources WHERE id = p_resource_id;

    IF v_capacity IS NULL THEN
        RETURN NULL;  -- soft capacity
    END IF;

    -- Count overlapping confirmed reservations
    SELECT COALESCE(COUNT(*), 0) INTO v_confirmed
    FROM reservations
    WHERE resource_id = p_resource_id
      AND status = 'confirmed'
      AND valid_from < p_until
      AND valid_until > p_from;

    -- Count overlapping active holds
    SELECT COALESCE(SUM(quantity), 0) INTO v_held
    FROM capacity_holds
    WHERE resource_id = p_resource_id
      AND resource_slot_id IS NULL
      AND status = 'active'
      AND expires_at > now()
      AND hold_from < p_until
      AND hold_until > p_from;

    RETURN GREATEST(v_capacity - v_confirmed - v_held, 0);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Order Number Generator
--    Format: ORD-{YYYYMMDD}-{sequence}  e.g. ORD-20260306-0001
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number(p_venue_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_seq    BIGINT;
    v_date   TEXT;
BEGIN
    v_seq  := nextval('order_number_seq');
    v_date := to_char(now(), 'YYYYMMDD');
    RETURN 'ORD-' || v_date || '-' || lpad(v_seq::TEXT, 6, '0');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Expire Stale Capacity Holds
--    Called by scheduled job every 60 seconds.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION expire_stale_holds()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE capacity_holds
    SET status = 'expired', released_at = now()
    WHERE status = 'active' AND expires_at < now();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Live Headcount per Resource
--    entry scans − exit scans for today
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_live_headcount(p_resource_id UUID)
RETURNS INT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_entries INT;
    v_exits   INT;
BEGIN
    SELECT
        COALESCE(SUM(CASE WHEN rul.usage_type = 'entry' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN rul.usage_type = 'exit'  THEN 1 ELSE 0 END), 0)
    INTO v_entries, v_exits
    FROM reservation_usage_logs rul
    JOIN reservations res ON res.id = rul.reservation_id
    WHERE res.resource_id = p_resource_id
      AND rul.timestamp::DATE = CURRENT_DATE;

    RETURN GREATEST(v_entries - v_exits, 0);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Check Feature Flag
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_feature_enabled(
    p_venue_id    UUID,
    p_feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT is_enabled INTO v_enabled
    FROM venue_feature_flags
    WHERE venue_id = p_venue_id AND feature_key = p_feature_key;

    RETURN COALESCE(v_enabled, false);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Updated-at trigger (reusable)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply to tables with updated_at
CREATE TRIGGER trg_venue_settings_updated
    BEFORE UPDATE ON venue_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_fnb_inventory_updated
    BEFORE UPDATE ON fnb_inventory
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_retail_inventory_updated
    BEFORE UPDATE ON retail_inventory
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
