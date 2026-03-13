-- ============================================================================
-- VenuePlus Tables — Gift Cards
-- ============================================================================

CREATE TABLE gift_cards (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id                UUID NOT NULL REFERENCES venues(id),
    code                    TEXT NOT NULL UNIQUE,
    order_item_id           UUID NOT NULL REFERENCES order_items(id),
    issued_to_account_id    UUID REFERENCES accounts(id),
    face_value              NUMERIC(12,2) NOT NULL,
    current_balance         NUMERIC(12,2) NOT NULL,
    currency_code           TEXT NOT NULL,
    status                  gift_card_status NOT NULL DEFAULT 'active',
    expires_at              DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gift_card_transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gift_card_id        UUID NOT NULL REFERENCES gift_cards(id),
    order_payment_id    UUID REFERENCES order_payments(id),
    transaction_type    gift_card_tx_type NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    balance_after       NUMERIC(12,2) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID REFERENCES users(id)
);
