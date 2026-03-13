-- ============================================================================
-- VenuePlus Tables — Customer Identity
-- ============================================================================
-- Tables: accounts, persons, account_persons, account_otp_log
-- ============================================================================

-- ── Accounts ─────────────────────────────────────────────────────────────────

CREATE TABLE accounts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    email             TEXT,
    mobile_number     TEXT,
    display_name      TEXT NOT NULL,
    password_hash     TEXT,
    auth_provider     auth_provider NOT NULL DEFAULT 'mobile',
    is_verified       BOOLEAN NOT NULL DEFAULT false,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id),
    CONSTRAINT accounts_contact_check CHECK (email IS NOT NULL OR mobile_number IS NOT NULL)
);

CREATE UNIQUE INDEX uq_accounts_venue_email
    ON accounts (venue_id, email) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX uq_accounts_venue_mobile
    ON accounts (venue_id, mobile_number) WHERE mobile_number IS NOT NULL;

-- ── Persons ──────────────────────────────────────────────────────────────────

CREATE TABLE persons (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    first_name        TEXT NOT NULL,
    last_name         TEXT,
    date_of_birth     DATE,
    is_minor          BOOLEAN NOT NULL DEFAULT false,
    gender            gender_type,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id)
);

-- ── Account–Person Relationship ──────────────────────────────────────────────

CREATE TABLE account_persons (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id        UUID NOT NULL REFERENCES accounts(id),
    person_id         UUID NOT NULL REFERENCES persons(id),
    relationship      person_relationship NOT NULL DEFAULT 'self',
    is_primary        BOOLEAN NOT NULL DEFAULT false,
    can_manage        BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, person_id)
);

-- ── OTP Log ──────────────────────────────────────────────────────────────────

CREATE TABLE account_otp_log (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id        UUID REFERENCES accounts(id),     -- NULL during registration
    channel           otp_channel NOT NULL,
    recipient         TEXT NOT NULL,
    purpose           otp_purpose NOT NULL,
    otp_hash          TEXT NOT NULL,
    expires_at        TIMESTAMPTZ NOT NULL,
    verified_at       TIMESTAMPTZ,
    attempt_count     INT NOT NULL DEFAULT 0,
    is_used           BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
