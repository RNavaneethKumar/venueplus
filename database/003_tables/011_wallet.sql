-- ============================================================================
-- VenuePlus Tables — Wallet System
-- ============================================================================
-- Tables: wallets, wallet_transactions
-- ============================================================================

CREATE TABLE wallets (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id                  UUID NOT NULL REFERENCES accounts(id),
    venue_id                    UUID NOT NULL REFERENCES venues(id),
    real_cash_balance           NUMERIC(12,2) NOT NULL DEFAULT 0,
    bonus_cash_balance          NUMERIC(12,2) NOT NULL DEFAULT 0,
    redemption_points_balance   NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active                   BOOLEAN NOT NULL DEFAULT true,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallet_transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id           UUID NOT NULL REFERENCES wallets(id),
    order_item_id       UUID REFERENCES order_items(id),
    transaction_type    wallet_tx_type NOT NULL,
    balance_type        wallet_balance_type NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    balance_after       NUMERIC(12,2) NOT NULL,
    reference           TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          UUID REFERENCES users(id)
);
