-- ============================================================================
-- VenuePlus Tables — Products & Configuration
-- ============================================================================
-- Tables: products, product_prices, product_tax_structures,
--         product_reservation_config, product_resource_mapping
-- ============================================================================

CREATE TABLE products (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID REFERENCES venues(id),       -- NULL = global
    name              TEXT NOT NULL,
    code              TEXT,
    product_type      product_type NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX uq_products_venue_code
    ON products (COALESCE(venue_id, '00000000-0000-0000-0000-000000000000'::uuid), code)
    WHERE code IS NOT NULL;

CREATE TABLE product_prices (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id        UUID NOT NULL REFERENCES products(id),
    visitor_type_id   UUID REFERENCES visitor_types(id),
    base_price        NUMERIC(12,2) NOT NULL,
    currency_code     TEXT NOT NULL,
    sales_channel     sales_channel,
    effective_from    TIMESTAMPTZ,
    effective_until   TIMESTAMPTZ,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id)
);

CREATE TABLE product_tax_structures (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id          UUID NOT NULL REFERENCES products(id),
    tax_structure_id    UUID NOT NULL REFERENCES tax_structures(id),
    effective_from      DATE,
    effective_until     DATE,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID REFERENCES users(id)
);

CREATE TABLE product_reservation_config (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id            UUID NOT NULL REFERENCES products(id),
    reservation_type      reservation_type NOT NULL,
    usage_type            usage_type NOT NULL,
    duration_minutes      INT,
    requires_waiver       BOOLEAN NOT NULL DEFAULT true,
    allows_reentry        BOOLEAN NOT NULL DEFAULT false,
    entry_limit_per_day   INT,
    valid_days            INT,
    is_active             BOOLEAN NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by            UUID REFERENCES users(id)
);

CREATE TABLE product_resource_mapping (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id        UUID NOT NULL REFERENCES products(id),
    resource_id       UUID NOT NULL REFERENCES resources(id),
    is_primary        BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id),
    UNIQUE (product_id, resource_id)
);
