-- ============================================================================
-- VenuePlus Tables — Pricing Engine
-- ============================================================================
-- Tables: pricing_rules, pricing_rule_conditions, pricing_rule_actions,
--         promo_codes, promo_code_applicability, promo_code_usages,
--         bundle_promotions, bundle_promotion_items
-- ============================================================================

CREATE TABLE pricing_rules (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id          UUID REFERENCES venues(id),
    name              TEXT NOT NULL,
    rule_type         pricing_rule_type NOT NULL,
    priority          INT NOT NULL,
    is_stackable      BOOLEAN NOT NULL DEFAULT true,
    effective_from    TIMESTAMPTZ,
    effective_until   TIMESTAMPTZ,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id)
);

CREATE TABLE pricing_rule_conditions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pricing_rule_id     UUID NOT NULL REFERENCES pricing_rules(id),
    condition_type      pricing_condition_type NOT NULL,
    operator            pricing_condition_operator NOT NULL,
    value               TEXT NOT NULL
);

CREATE TABLE pricing_rule_actions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pricing_rule_id     UUID NOT NULL REFERENCES pricing_rules(id),
    action_type         pricing_action_type NOT NULL,
    value               NUMERIC(12,2),
    target_product_id   UUID REFERENCES products(id)
);

CREATE TABLE promo_codes (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id                  UUID REFERENCES venues(id),
    code                      TEXT NOT NULL UNIQUE,
    description               TEXT,
    discount_type             discount_type NOT NULL,
    discount_value            NUMERIC(12,2) NOT NULL,
    minimum_order_amount      NUMERIC(12,2),
    max_uses                  INT,
    max_uses_per_customer     INT NOT NULL DEFAULT 1,
    current_uses              INT NOT NULL DEFAULT 0,
    is_stackable              BOOLEAN NOT NULL DEFAULT false,
    effective_from            TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_until           TIMESTAMPTZ,
    is_active                 BOOLEAN NOT NULL DEFAULT true,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by                UUID REFERENCES users(id)
);

CREATE TABLE promo_code_applicability (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id     UUID NOT NULL REFERENCES promo_codes(id),
    product_id        UUID REFERENCES products(id),
    visitor_type_id   UUID REFERENCES visitor_types(id),
    sales_channel     sales_channel
);

CREATE TABLE promo_code_usages (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id     UUID NOT NULL REFERENCES promo_codes(id),
    order_id          UUID NOT NULL REFERENCES orders(id),
    account_id        UUID REFERENCES accounts(id),
    discount_amount   NUMERIC(12,2) NOT NULL,
    used_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    status            promo_usage_status NOT NULL DEFAULT 'applied'
);

CREATE TABLE bundle_promotions (
    id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id                      UUID REFERENCES venues(id),
    name                          TEXT NOT NULL,
    bundle_type                   bundle_type NOT NULL,
    max_applications_per_order    INT,
    effective_from                TIMESTAMPTZ,
    effective_until               TIMESTAMPTZ,
    is_active                     BOOLEAN NOT NULL DEFAULT true,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by                    UUID REFERENCES users(id)
);

CREATE TABLE bundle_promotion_items (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_promotion_id     UUID NOT NULL REFERENCES bundle_promotions(id),
    product_id              UUID NOT NULL REFERENCES products(id),
    role                    bundle_item_role NOT NULL,
    required_quantity       INT,
    reward_quantity         INT,
    discount_value          NUMERIC(12,2),
    is_price_overridden     BOOLEAN,
    is_auto_added           BOOLEAN,
    is_removable            BOOLEAN
);
