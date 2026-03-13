-- ============================================================================
-- VenuePlus Tables — Food & Beverage
-- ============================================================================

CREATE TABLE fnb_categories (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    name              TEXT NOT NULL,
    parent_id         UUID REFERENCES fnb_categories(id),
    display_order     INT,
    is_active         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE preparation_stations (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    name              TEXT NOT NULL,
    device_id         UUID REFERENCES devices(id),
    is_active         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE fnb_items (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id                  UUID NOT NULL REFERENCES products(id),
    venue_id                    UUID NOT NULL REFERENCES venues(id),
    category_id                 UUID NOT NULL REFERENCES fnb_categories(id),
    preparation_station_id      UUID REFERENCES preparation_stations(id),
    preparation_time_minutes    INT,
    is_available                BOOLEAN NOT NULL DEFAULT true,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kitchen_orders (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id                UUID NOT NULL REFERENCES orders(id),
    preparation_station_id  UUID NOT NULL REFERENCES preparation_stations(id),
    status                  kitchen_order_status NOT NULL DEFAULT 'pending',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at              TIMESTAMPTZ,
    ready_at                TIMESTAMPTZ,
    served_at               TIMESTAMPTZ
);

CREATE TABLE kitchen_order_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kitchen_order_id    UUID NOT NULL REFERENCES kitchen_orders(id),
    order_item_id       UUID NOT NULL REFERENCES order_items(id),
    quantity            INT NOT NULL,
    notes               TEXT,
    status              kitchen_item_status NOT NULL DEFAULT 'pending'
);

CREATE TABLE fnb_inventory (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id                UUID NOT NULL REFERENCES venues(id),
    fnb_item_id             UUID NOT NULL REFERENCES fnb_items(id),
    current_stock           NUMERIC(10,3) NOT NULL DEFAULT 0,
    stock_unit              TEXT NOT NULL DEFAULT 'units',
    low_stock_threshold     NUMERIC(10,3),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fnb_inventory_adjustments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fnb_inventory_id    UUID NOT NULL REFERENCES fnb_inventory(id),
    adjustment_type     fnb_adjustment_type NOT NULL,
    quantity            NUMERIC(10,3) NOT NULL,
    reason_code         TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID NOT NULL REFERENCES users(id)
);
