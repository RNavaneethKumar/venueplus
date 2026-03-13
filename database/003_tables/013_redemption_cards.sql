-- ============================================================================
-- VenuePlus Tables — Redemption Cards
-- ============================================================================

CREATE TABLE redemption_cards (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id            UUID NOT NULL REFERENCES venues(id),
    account_id          UUID NOT NULL REFERENCES accounts(id),
    card_type           redemption_card_type NOT NULL,
    code                TEXT NOT NULL UNIQUE,
    total_visits        INT,
    remaining_visits    INT,
    credit_balance      NUMERIC(12,2),
    status              redemption_card_status NOT NULL DEFAULT 'active',
    expires_at          DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE redemption_card_transactions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    redemption_card_id      UUID NOT NULL REFERENCES redemption_cards(id),
    order_item_id           UUID REFERENCES order_items(id),
    transaction_type        redemption_card_tx_type NOT NULL,
    visits_delta            INT,
    credit_delta            NUMERIC(12,2),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
