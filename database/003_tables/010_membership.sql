-- ============================================================================
-- VenuePlus Tables — Membership
-- ============================================================================
-- Tables: membership_plans, membership_benefits, memberships,
--         membership_members, membership_allowance_balances,
--         membership_allowance_transactions
-- ============================================================================

CREATE TABLE membership_plans (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id        UUID NOT NULL REFERENCES products(id),
    venue_id          UUID NOT NULL REFERENCES venues(id),
    name              TEXT NOT NULL,
    billing_cycle     billing_cycle NOT NULL,
    price             NUMERIC(12,2) NOT NULL,
    max_members       INT,
    is_family_plan    BOOLEAN NOT NULL DEFAULT false,
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        UUID REFERENCES users(id)
);

CREATE TABLE membership_benefits (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_plan_id      UUID NOT NULL REFERENCES membership_plans(id),
    benefit_type            membership_benefit_type NOT NULL,
    product_category        TEXT,
    product_id              UUID REFERENCES products(id),
    discount_percent        NUMERIC(5,2),
    allowance_quantity      NUMERIC(10,2),
    allowance_unit          allowance_unit,
    allowance_reset_cycle   allowance_reset_cycle,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id           UUID NOT NULL REFERENCES order_items(id),
    membership_plan_id      UUID NOT NULL REFERENCES membership_plans(id),
    account_id              UUID NOT NULL REFERENCES accounts(id),
    status                  membership_status NOT NULL DEFAULT 'active',
    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_start    DATE NOT NULL,
    current_period_end      DATE NOT NULL,
    next_billing_date       DATE,
    cancelled_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE membership_members (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_id     UUID NOT NULL REFERENCES memberships(id),
    person_id         UUID NOT NULL REFERENCES persons(id),
    is_primary        BOOLEAN NOT NULL DEFAULT false,
    added_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at        TIMESTAMPTZ
);

CREATE TABLE membership_allowance_balances (
    id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_id             UUID NOT NULL REFERENCES memberships(id),
    membership_benefit_id     UUID NOT NULL REFERENCES membership_benefits(id),
    period_start              DATE NOT NULL,
    period_end                DATE NOT NULL,
    total_allowance           NUMERIC(10,2) NOT NULL,
    used_allowance            NUMERIC(10,2) NOT NULL DEFAULT 0,
    remaining_allowance       NUMERIC(10,2) NOT NULL
);

CREATE TABLE membership_allowance_transactions (
    id                                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_allowance_balance_id     UUID NOT NULL REFERENCES membership_allowance_balances(id),
    order_item_id                       UUID REFERENCES order_items(id),
    transaction_type                    allowance_tx_type NOT NULL,
    quantity                            NUMERIC(10,2) NOT NULL,
    created_at                          TIMESTAMPTZ NOT NULL DEFAULT now()
);
