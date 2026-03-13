-- ============================================================================
-- VenuePlus Tables — Reservations & Capacity Holds
-- ============================================================================
-- Tables: capacity_holds, reservation_groups, reservations,
--         reservation_usage_logs, devices (+ device_resource_mapping),
--         audit_logs
-- ============================================================================

-- ── Devices (needs resources FK) ─────────────────────────────────────────────

CREATE TABLE devices (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id            UUID NOT NULL REFERENCES venues(id),
    name                TEXT NOT NULL,
    device_type         device_type NOT NULL,
    identifier          TEXT,
    auth_token_hash     TEXT,
    status              device_status NOT NULL DEFAULT 'active',
    last_heartbeat_at   TIMESTAMPTZ,
    last_ip_address     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID REFERENCES users(id)
);

CREATE TABLE device_resource_mapping (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id         UUID NOT NULL REFERENCES devices(id),
    resource_id       UUID NOT NULL REFERENCES resources(id),
    is_entry_point    BOOLEAN NOT NULL DEFAULT true,
    is_exit_point     BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id),
    UNIQUE (device_id, resource_id)
);

-- ── Audit Logs (needs devices FK) ────────────────────────────────────────────

CREATE TABLE audit_logs (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp                TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id                  UUID REFERENCES users(id),
    impersonated_user_id     UUID REFERENCES users(id),
    venue_id                 UUID REFERENCES venues(id),
    device_id                UUID REFERENCES devices(id),
    action_type              TEXT NOT NULL,
    entity_type              TEXT,
    entity_id                UUID,
    metadata                 JSONB,
    ip_address               TEXT
);

-- ── Capacity Holds ───────────────────────────────────────────────────────────

CREATE TABLE capacity_holds (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id            UUID NOT NULL REFERENCES venues(id),
    resource_id         UUID NOT NULL REFERENCES resources(id),
    resource_slot_id    UUID REFERENCES resource_slots(id),
    session_token       TEXT NOT NULL,
    account_id          UUID REFERENCES accounts(id),
    visitor_type_id     UUID NOT NULL REFERENCES visitor_types(id),
    quantity            INT NOT NULL,
    hold_from           TIMESTAMPTZ NOT NULL,
    hold_until          TIMESTAMPTZ NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    status              capacity_hold_status NOT NULL DEFAULT 'active',
    order_id            UUID REFERENCES orders(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at         TIMESTAMPTZ
);

-- ── Reservation Groups ───────────────────────────────────────────────────────

CREATE TABLE reservation_groups (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id     UUID REFERENCES order_items(id),
    event_id          UUID,                              -- FK to events if needed later
    name              TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id)
);

-- ── Reservations ─────────────────────────────────────────────────────────────

CREATE TABLE reservations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id           UUID NOT NULL REFERENCES order_items(id),
    product_id              UUID NOT NULL REFERENCES products(id),
    resource_id             UUID NOT NULL REFERENCES resources(id),
    resource_slot_id        UUID REFERENCES resource_slots(id),
    visitor_type_id         UUID NOT NULL REFERENCES visitor_types(id),
    person_id               UUID REFERENCES persons(id),
    reservation_type        reservation_type NOT NULL,
    reservation_group_id    UUID REFERENCES reservation_groups(id),
    usage_type              usage_type NOT NULL,
    duration_minutes        INT,
    valid_from              TIMESTAMPTZ,
    valid_until             TIMESTAMPTZ,
    actual_entry_time       TIMESTAMPTZ,
    actual_expiry_time      TIMESTAMPTZ,
    entry_limit_per_day     INT,
    entries_used            INT NOT NULL DEFAULT 0,
    status                  reservation_status NOT NULL DEFAULT 'confirmed',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Reservation Usage Logs ───────────────────────────────────────────────────

CREATE TABLE reservation_usage_logs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id    UUID NOT NULL REFERENCES reservations(id),
    device_id         UUID REFERENCES devices(id),
    usage_type        scan_usage_type NOT NULL,
    timestamp         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
