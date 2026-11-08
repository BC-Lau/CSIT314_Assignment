
-- User Stories #3 / #20
-- Cancellation support with preserved booking history.
-- Run once against the existing database.

PRAGMA foreign_keys = ON;

BEGIN IMMEDIATE;

-- Rename the original table.
ALTER TABLE consultation_request
RENAME TO consultation_request_old;

-- Create the replacement table.
CREATE TABLE consultation_request (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id      INTEGER NOT NULL
                 REFERENCES consultation_slot(id),
    customer_id  INTEGER NOT NULL
                 REFERENCES user_account(id),
    message      TEXT,
    status       TEXT NOT NULL DEFAULT 'booked'
                 CHECK (status IN ('booked', 'cancelled')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    cancelled_at TEXT
);

-- Preserve existing bookings.
INSERT INTO consultation_request (
    id, slot_id, customer_id, message,
    status, created_at, cancelled_at
)
SELECT
    id, slot_id, customer_id, message,
    'booked', created_at, NULL
FROM consultation_request_old;

-- Remove the old table and its UNIQUE(slot_id) constraint.
DROP TABLE consultation_request_old;

-- Only one active booking is permitted per slot.
CREATE UNIQUE INDEX idx_consultation_request_active_slot
ON consultation_request(slot_id)
WHERE status = 'booked';

CREATE INDEX idx_consultation_request_customer
ON consultation_request(customer_id);

COMMIT;
