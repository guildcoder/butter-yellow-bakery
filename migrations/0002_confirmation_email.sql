ALTER TABLE orders ADD COLUMN email TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN marketing_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(marketing_opt_in IN(0,1));
CREATE TABLE newsletter_signups (
 email TEXT PRIMARY KEY,
 opted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 consent_text TEXT NOT NULL,
 synced INTEGER NOT NULL DEFAULT 0,
 last_error TEXT
);
CREATE TABLE email_outbox (
 order_id TEXT PRIMARY KEY REFERENCES orders(id),
 content TEXT NOT NULL,
 payload TEXT,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sending','accepted','failed')),
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0,
 first_attempt INTEGER,
 lease_until INTEGER NOT NULL DEFAULT 0,
 provider_id TEXT,
 last_error TEXT,
 accepted_at TEXT
);
CREATE INDEX idx_email_outbox_due ON email_outbox(status,next_attempt);
