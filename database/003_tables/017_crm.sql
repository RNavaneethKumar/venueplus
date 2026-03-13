-- ============================================================================
-- VenuePlus Tables — CRM & Marketing
-- ============================================================================

CREATE TABLE customer_activities (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id        UUID NOT NULL REFERENCES accounts(id),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    activity_type     customer_activity_type NOT NULL,
    entity_type       TEXT,
    entity_id         UUID,
    metadata          JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_segments (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    name              TEXT NOT NULL,
    description       TEXT,
    segment_type      segment_type NOT NULL,
    rules             JSONB,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id)
);

CREATE TABLE customer_segment_members (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    segment_id        UUID NOT NULL REFERENCES customer_segments(id),
    account_id        UUID NOT NULL REFERENCES accounts(id),
    added_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at        TIMESTAMPTZ
);

CREATE TABLE customer_tags (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id        UUID NOT NULL REFERENCES accounts(id),
    tag               TEXT NOT NULL,
    applied_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_by        tag_source NOT NULL DEFAULT 'system',
    expires_at        TIMESTAMPTZ
);

CREATE TABLE customer_notes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id        UUID NOT NULL REFERENCES accounts(id),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    note              TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE marketing_campaigns (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id                    UUID NOT NULL REFERENCES venues(id),
    name                        TEXT NOT NULL,
    channel                     campaign_channel NOT NULL,
    segment_id                  UUID REFERENCES customer_segments(id),
    notification_template_id    UUID REFERENCES notification_templates(id),
    trigger_type                campaign_trigger_type NOT NULL,
    trigger_event               TEXT,
    trigger_offset_hours        INT,
    scheduled_at                TIMESTAMPTZ,
    status                      campaign_status NOT NULL DEFAULT 'draft',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by                  UUID REFERENCES users(id)
);

CREATE TABLE marketing_campaign_sends (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id             UUID NOT NULL REFERENCES marketing_campaigns(id),
    account_id              UUID NOT NULL REFERENCES accounts(id),
    sent_at                 TIMESTAMPTZ,
    opened_at               TIMESTAMPTZ,
    clicked_at              TIMESTAMPTZ,
    converted_at            TIMESTAMPTZ,
    revenue_attributed      NUMERIC(12,2),
    status                  campaign_send_status NOT NULL DEFAULT 'pending'
);
