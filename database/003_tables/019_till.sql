-- ============================================================================
-- VenuePlus Tables — Till Management
-- ============================================================================
-- Tables: cash_drawers, cash_sessions, cash_movements
-- Also wires the FK from orders.cash_session_id → cash_sessions.id
-- (orders is created in 006_orders.sql before this file runs, so the
--  column is declared there without a FK and the constraint is added here)
-- ============================================================================

-- ── cash_drawers ──────────────────────────────────────────────────────────────
-- Named physical or logical tills.
-- Used when the pos.till_mode venue setting is 'counter' (the default).
-- In user mode, sessions reference the cashier directly; drawer_id is NULL.

CREATE TABLE cash_drawers (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id    UUID        NOT NULL REFERENCES venues(id),
    name        TEXT        NOT NULL,
    description TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by  UUID        REFERENCES users(id)
);

-- ── cash_sessions ─────────────────────────────────────────────────────────────
-- One row per open-to-close cycle.
--
-- Counter mode: only one open session per drawer  (enforced by partial unique index).
-- User mode:    only one open session per user     (enforced by partial unique index).
--
-- expected_amount is ALWAYS computed server-side at close time and is never
-- accepted from the client.

CREATE TABLE cash_sessions (
    id          UUID                NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id    UUID                NOT NULL REFERENCES venues(id),

    -- NULL when pos.till_mode = 'user'
    drawer_id   UUID                REFERENCES cash_drawers(id),

    opened_by   UUID                NOT NULL REFERENCES users(id),
    closed_by   UUID                REFERENCES users(id),   -- NULL for auto / forced

    status      cash_session_status NOT NULL DEFAULT 'open',
    open_time   TIMESTAMPTZ         NOT NULL DEFAULT now(),
    close_time  TIMESTAMPTZ,

    -- Float recorded at open
    opening_amount         NUMERIC(12,2) NOT NULL,
    opening_denominations  JSONB,          -- e.g. {"500": 3, "100": 5, "50": 2}

    -- Cash count entered by cashier at close (NULL for blind/forced close)
    actual_amount          NUMERIC(12,2),
    actual_denominations   JSONB,

    -- Server-computed at close; never trusted from client
    expected_amount        NUMERIC(12,2),

    -- actual_amount - expected_amount (positive = overage, negative = shortage)
    variance               NUMERIC(12,2),

    close_type             cash_close_type,

    -- Manager approval when variance is present
    variance_approved_by   UUID        REFERENCES users(id),
    variance_approved_at   TIMESTAMPTZ,
    variance_note          TEXT,

    -- Immutable Z-Report JSON snapshot; written once at close, never mutated
    z_report_data          JSONB,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── cash_movements ────────────────────────────────────────────────────────────
-- Cash-in / cash-out events recorded during an open session.
-- Each movement adjusts the expected closing balance.

CREATE TABLE cash_movements (
    id            UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id      UUID               NOT NULL REFERENCES venues(id),
    session_id    UUID               NOT NULL REFERENCES cash_sessions(id),
    movement_type cash_movement_type NOT NULL,
    amount        NUMERIC(12,2)      NOT NULL CHECK (amount > 0),
    reason        TEXT               NOT NULL,
    recorded_by   UUID               NOT NULL REFERENCES users(id),
    -- Set when the amount exceeds the pos.cash_movement_approval_threshold setting
    approved_by   UUID               REFERENCES users(id),
    created_at    TIMESTAMPTZ        NOT NULL DEFAULT now()
);

-- ── Deferred FK: orders → cash_sessions ──────────────────────────────────────
-- orders.cash_session_id is declared in 006_orders.sql without a FK because
-- cash_sessions did not exist at that point. The constraint is added here.

ALTER TABLE orders
    ADD CONSTRAINT fk_orders_cash_session
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id);
