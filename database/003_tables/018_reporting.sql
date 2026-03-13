-- ============================================================================
-- VenuePlus Tables — Reporting & BI
-- ============================================================================

CREATE TABLE daily_revenue_stats (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id            UUID NOT NULL REFERENCES venues(id),
    stat_date           DATE NOT NULL,
    channel             TEXT NOT NULL,
    product_type        TEXT NOT NULL,
    gross_revenue       NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_revenue         NUMERIC(12,2) NOT NULL DEFAULT 0,
    transaction_count   INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hourly_occupancy_stats (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id                UUID NOT NULL REFERENCES venues(id),
    resource_id             UUID NOT NULL REFERENCES resources(id),
    stat_date               DATE NOT NULL,
    stat_hour               INT NOT NULL CHECK (stat_hour BETWEEN 0 AND 23),
    peak_headcount          INT NOT NULL DEFAULT 0,
    avg_headcount           NUMERIC(10,2) NOT NULL DEFAULT 0,
    capacity                INT,
    utilization_percent     NUMERIC(5,2),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
