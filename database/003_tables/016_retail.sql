-- ============================================================================
-- VenuePlus Tables — Retail
-- ============================================================================

CREATE TABLE retail_items (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id              UUID NOT NULL REFERENCES products(id),
    venue_id                UUID NOT NULL REFERENCES venues(id),
    sku                     TEXT NOT NULL,
    name                    TEXT NOT NULL,
    barcode                 TEXT,
    variant_attributes      JSONB,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE retail_inventory (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retail_item_id          UUID NOT NULL REFERENCES retail_items(id),
    current_stock           INT NOT NULL DEFAULT 0,
    low_stock_threshold     INT,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE retail_inventory_transactions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retail_inventory_id     UUID NOT NULL REFERENCES retail_inventory(id),
    order_item_id           UUID REFERENCES order_items(id),
    transaction_type        retail_tx_type NOT NULL,
    quantity_delta          INT NOT NULL,
    reason_code             TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by              UUID NOT NULL REFERENCES users(id)
);
