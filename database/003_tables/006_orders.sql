-- ============================================================================
-- VenuePlus Tables — Orders & Payments
-- ============================================================================
-- Tables: orders, order_items, order_item_price_components,
--         order_item_adjustments, order_item_tax_components,
--         order_payments, payment_transactions, order_status_history
-- ============================================================================

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number        TEXT NOT NULL,
    venue_id            UUID NOT NULL REFERENCES venues(id),
    account_id          UUID REFERENCES accounts(id),
    order_type          order_type NOT NULL DEFAULT 'sale',
    status              order_status NOT NULL DEFAULT 'pending',
    currency_code       TEXT NOT NULL,
    subtotal_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
    source_channel      sales_channel NOT NULL,
    parent_order_id     UUID REFERENCES orders(id),
    notes               TEXT,
    -- FK to cash_sessions added after that table is created (see 019_till.sql)
    cash_session_id     UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID REFERENCES users(id)
);

CREATE TABLE order_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID NOT NULL REFERENCES orders(id),
    product_id          UUID NOT NULL REFERENCES products(id),
    visitor_type_id     UUID REFERENCES visitor_types(id),
    quantity            INT NOT NULL DEFAULT 1,
    unit_price          NUMERIC(12,2) NOT NULL,
    discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(12,2) NOT NULL,
    price_overridden    BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_item_price_components (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id       UUID NOT NULL REFERENCES order_items(id),
    component_type      price_component_type NOT NULL,
    source_id           UUID,
    amount              NUMERIC(12,2) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_item_adjustments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id       UUID NOT NULL REFERENCES order_items(id),
    adjustment_source   adjustment_source NOT NULL,
    source_id           UUID,
    adjustment_type     adjustment_type NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_item_tax_components (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id       UUID NOT NULL REFERENCES order_items(id),
    tax_component_id    UUID NOT NULL REFERENCES tax_components(id),
    tax_rate_percent    NUMERIC(5,2) NOT NULL,
    tax_amount          NUMERIC(12,2) NOT NULL
);

CREATE TABLE order_payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID NOT NULL REFERENCES orders(id),
    payment_method      payment_method NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    reference_id        UUID,
    status              payment_status NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_transactions (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_payment_id         UUID NOT NULL REFERENCES order_payments(id),
    gateway                  TEXT NOT NULL,
    gateway_transaction_id   TEXT NOT NULL,
    status                   gateway_tx_status NOT NULL,
    response_payload         JSONB NOT NULL DEFAULT '{}',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_status_history (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id            UUID NOT NULL REFERENCES orders(id),
    previous_status     TEXT NOT NULL,
    new_status          TEXT NOT NULL,
    changed_by          UUID REFERENCES users(id),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason              TEXT
);
