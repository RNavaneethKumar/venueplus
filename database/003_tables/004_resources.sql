-- ============================================================================
-- VenuePlus Tables — Resources & Slotting
-- ============================================================================
-- Tables: visitor_types, resources, resource_slot_templates, resource_slots
-- ============================================================================

CREATE TABLE visitor_types (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID REFERENCES venues(id),       -- NULL = global
    name              TEXT NOT NULL,
    code              TEXT NOT NULL,
    description       TEXT,
    is_minor          BOOLEAN NOT NULL DEFAULT false,
    requires_waiver   BOOLEAN NOT NULL DEFAULT true,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX uq_visitor_types_venue_code
    ON visitor_types (COALESCE(venue_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

CREATE TABLE resources (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id                    UUID NOT NULL REFERENCES venues(id),
    name                        TEXT NOT NULL,
    description                 TEXT,
    admission_mode              admission_mode NOT NULL,
    capacity_enforcement_type   capacity_enforcement_type NOT NULL DEFAULT 'hard',
    capacity                    INT,
    is_active                   BOOLEAN NOT NULL DEFAULT true,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by                  UUID REFERENCES users(id)
);

CREATE TABLE resource_slot_templates (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id             UUID NOT NULL REFERENCES resources(id),
    version                 INT NOT NULL,
    name                    TEXT,
    start_time              TIME NOT NULL,
    end_time                TIME NOT NULL,
    slot_duration_minutes   INT NOT NULL,
    recurrence_type         slot_recurrence_type NOT NULL DEFAULT 'daily',
    days_of_week            INT[],
    effective_from          DATE NOT NULL,
    effective_until         DATE,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              UUID REFERENCES users(id),
    UNIQUE (resource_id, version)
);

CREATE TABLE resource_slots (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id              UUID NOT NULL REFERENCES resources(id),
    slot_template_id         UUID REFERENCES resource_slot_templates(id),
    slot_template_version    INT,
    slot_date                DATE NOT NULL,
    start_time               TIME NOT NULL,
    end_time                 TIME NOT NULL,
    capacity                 INT,               -- NULL = use resource.capacity
    is_active                BOOLEAN NOT NULL DEFAULT true,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by               UUID REFERENCES users(id)
);
