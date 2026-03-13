-- ============================================================================
-- VenuePlus Tables — Waivers
-- ============================================================================
-- Tables: waiver_templates, product_waiver_mapping,
--         waiver_signatures, waiver_signature_persons
-- ============================================================================

CREATE TABLE waiver_templates (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    name              TEXT NOT NULL,
    version           INT NOT NULL,
    content_html      TEXT NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    effective_from    DATE NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id),
    UNIQUE (venue_id, version)
);

CREATE TABLE product_waiver_mapping (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id            UUID NOT NULL REFERENCES products(id),
    waiver_template_id    UUID NOT NULL REFERENCES waiver_templates(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE waiver_signatures (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    waiver_template_id          UUID NOT NULL REFERENCES waiver_templates(id),
    waiver_template_version     INT NOT NULL,
    signed_by_account_id        UUID NOT NULL REFERENCES accounts(id),
    signature_data              TEXT NOT NULL,
    signed_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address                  TEXT NOT NULL,
    user_agent                  TEXT NOT NULL,
    pdf_url                     TEXT,
    pdf_hash                    TEXT,
    otp_verified                BOOLEAN NOT NULL DEFAULT false,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE waiver_signature_persons (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    waiver_signature_id     UUID NOT NULL REFERENCES waiver_signatures(id),
    person_id               UUID NOT NULL REFERENCES persons(id),
    is_self                 BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
