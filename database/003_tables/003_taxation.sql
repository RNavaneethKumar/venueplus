-- ============================================================================
-- VenuePlus Tables — Taxation
-- ============================================================================
-- Tables: tax_components, tax_structures, tax_structure_components
-- ============================================================================

CREATE TABLE tax_components (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code              TEXT NOT NULL,
    name              TEXT NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tax_structures (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID REFERENCES venues(id),       -- NULL = global
    name              TEXT NOT NULL,
    code              TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id)
);

CREATE TABLE tax_structure_components (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_structure_id      UUID NOT NULL REFERENCES tax_structures(id),
    tax_component_id      UUID NOT NULL REFERENCES tax_components(id),
    tax_rate_percent      NUMERIC(5,2) NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
