-- ============================================================================
-- VenuePlus Tables — Platform Governance
-- ============================================================================
-- Tables: users, roles, permissions, role_permissions, venues, user_roles,
--         venue_settings, venue_feature_flags, devices, device_resource_mapping,
--         audit_logs, notification_templates, api_keys, alert_rules, alerts_log
-- ============================================================================

-- ── Users (no FK dependencies) ───────────────────────────────────────────────

CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username          TEXT NOT NULL UNIQUE,
    display_name      TEXT NOT NULL,
    pin_hash          TEXT NOT NULL,
    mobile_number     TEXT,
    email             TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    is_locked         BOOLEAN NOT NULL DEFAULT false,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id)
);

-- ── Roles ────────────────────────────────────────────────────────────────────

CREATE TABLE roles (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              TEXT NOT NULL UNIQUE,
    description       TEXT,
    scope_type        scope_type NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Permissions ──────────────────────────────────────────────────────────────

CREATE TABLE permissions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key               TEXT NOT NULL UNIQUE,
    module            TEXT NOT NULL,
    description       TEXT,
    is_sensitive      BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Role–Permission Mapping ──────────────────────────────────────────────────

CREATE TABLE role_permissions (
    role_id           UUID NOT NULL REFERENCES roles(id),
    permission_id     UUID NOT NULL REFERENCES permissions(id),
    granted           BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

-- ── Venues ───────────────────────────────────────────────────────────────────

CREATE TABLE venues (
    id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                       TEXT NOT NULL,
    legal_name                 TEXT,
    timezone                   TEXT NOT NULL,
    currency_code              TEXT NOT NULL,
    country_code               TEXT NOT NULL,
    tax_regime                 TEXT,
    tax_registration_number    TEXT,
    registered_address         TEXT,
    status                     venue_status NOT NULL DEFAULT 'active',
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by                 UUID REFERENCES users(id)
);

-- ── User–Role Assignment (venue-scoped) ──────────────────────────────────────

CREATE TABLE user_roles (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id),
    role_id           UUID NOT NULL REFERENCES roles(id),
    venue_id          UUID REFERENCES venues(id),       -- NULL = global
    assigned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by       UUID REFERENCES users(id),
    is_active         BOOLEAN NOT NULL DEFAULT true
);

-- ── Venue Settings ───────────────────────────────────────────────────────────

CREATE TABLE venue_settings (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    setting_key       TEXT NOT NULL,
    setting_value     JSONB NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by        UUID REFERENCES users(id),
    UNIQUE (venue_id, setting_key)
);

-- ── Venue Feature Flags ──────────────────────────────────────────────────────

CREATE TABLE venue_feature_flags (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    feature_key       TEXT NOT NULL,
    is_enabled        BOOLEAN NOT NULL DEFAULT false,
    enabled_at        TIMESTAMPTZ,
    disabled_at       TIMESTAMPTZ,
    updated_by        UUID REFERENCES users(id),
    UNIQUE (venue_id, feature_key)
);

-- ── Notification Templates ───────────────────────────────────────────────────

CREATE TABLE notification_templates (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID REFERENCES venues(id),       -- NULL = system default
    channel           notification_channel NOT NULL,
    template_key      TEXT NOT NULL,
    subject           TEXT,
    body              TEXT NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by        UUID REFERENCES users(id)
);

-- ── API Keys ─────────────────────────────────────────────────────────────────

CREATE TABLE api_keys (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id              UUID REFERENCES venues(id),    -- NULL = global
    name                  TEXT NOT NULL,
    key_hash              TEXT NOT NULL,
    scopes                JSONB NOT NULL,
    rate_limit_per_min    INT,
    status                api_key_status NOT NULL DEFAULT 'active',
    expires_at            TIMESTAMPTZ,
    last_used_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by            UUID REFERENCES users(id)
);

-- ── Alert Rules ──────────────────────────────────────────────────────────────

CREATE TABLE alert_rules (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id               UUID NOT NULL REFERENCES venues(id),
    alert_type             TEXT NOT NULL,
    threshold_value        NUMERIC,
    comparison_operator    alert_comparison_operator,
    time_window_minutes    INT,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ,
    updated_by             UUID REFERENCES users(id)
);

-- ── Alerts Log ───────────────────────────────────────────────────────────────

CREATE TABLE alerts_log (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_rule_id     UUID NOT NULL REFERENCES alert_rules(id),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    triggered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at       TIMESTAMPTZ,
    status            alert_status NOT NULL DEFAULT 'active',
    entity_type       TEXT,
    entity_id         UUID,
    details           JSONB,
    acknowledged_by   UUID REFERENCES users(id)
);
