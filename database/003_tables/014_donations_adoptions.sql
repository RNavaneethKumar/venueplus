-- ============================================================================
-- VenuePlus Tables — Donations & Adoptions
-- ============================================================================

-- ── Donations ────────────────────────────────────────────────────────────────

CREATE TABLE donation_causes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    name              TEXT NOT NULL,
    description       TEXT,
    image_url         TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE donations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id       UUID NOT NULL REFERENCES order_items(id),
    donation_cause_id   UUID NOT NULL REFERENCES donation_causes(id),
    account_id          UUID REFERENCES accounts(id),
    amount              NUMERIC(12,2) NOT NULL,
    donation_type       donation_type NOT NULL DEFAULT 'one_time',
    recurrence_cycle    donation_recurrence,
    is_anonymous        BOOLEAN NOT NULL DEFAULT false,
    receipt_issued      BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Adoptions ────────────────────────────────────────────────────────────────

CREATE TABLE adoptees (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    name              TEXT NOT NULL,
    species           TEXT,
    adoptee_type      adoptee_type NOT NULL,
    description       TEXT,
    image_url         TEXT,
    is_available      BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE adoptions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id           UUID NOT NULL REFERENCES order_items(id),
    adoptee_id              UUID NOT NULL REFERENCES adoptees(id),
    account_id              UUID NOT NULL REFERENCES accounts(id),
    person_id               UUID REFERENCES persons(id),
    sponsorship_start       DATE NOT NULL,
    sponsorship_end         DATE NOT NULL,
    certificate_issued      BOOLEAN NOT NULL DEFAULT false,
    status                  adoption_status NOT NULL DEFAULT 'active',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
