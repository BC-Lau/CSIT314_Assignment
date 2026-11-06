-- =====================================================================
-- CSIT314 Interior Design Platform - database schema (SQLite)
-- Every table name / column here is referenced by an ENTITY class in
-- backend/entity/. Keep them in sync with the class diagrams.
-- =====================================================================

-- User profiles = the 4 user types in the spec
CREATE TABLE IF NOT EXISTS user_profile (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_account (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    username       TEXT    NOT NULL UNIQUE,
    password_hash  TEXT    NOT NULL,
    email          TEXT,
    profile_id     INTEGER NOT NULL REFERENCES user_profile(id),
    is_active      INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Interior Design Project (IDP). style / type values come from database/tags.txt
CREATE TABLE IF NOT EXISTS idp (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    designer_id INTEGER NOT NULL REFERENCES user_account(id),
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL,
    budget      INTEGER,                       -- SGD
    house_size  INTEGER,                       -- square feet
    duration    TEXT,                          -- e.g. '12 weeks'
    visibility  TEXT    NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),  -- private = hidden from home / recommend pages
    style       TEXT    NOT NULL,              -- exactly 1 preset style
    type        TEXT    NOT NULL DEFAULT '[]', -- JSON array, 1..* preset types
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- #25: a customer contacting an interior designer
CREATE TABLE IF NOT EXISTS contact_request (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES user_account(id),
    designer_id INTEGER NOT NULL REFERENCES user_account(id),
    idp_id      INTEGER REFERENCES idp(id),    -- the IDP the customer was viewing (optional)
    message     TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- #1 Recommended IDPs using the IDPs a customer saved to their favourites list
CREATE TABLE IF NOT EXISTS favourite (
    user_id  INTEGER NOT NULL REFERENCES user_account(id),
    idp_id   INTEGER NOT NULL REFERENCES idp(id) ON DELETE CASCADE,
    saved_at TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, idp_id)
);

CREATE INDEX IF NOT EXISTS idx_idp_designer        ON idp(designer_id);
CREATE INDEX IF NOT EXISTS idx_contact_created_at  ON contact_request(created_at);

INSERT OR IGNORE INTO user_profile (name, description) VALUES
    ('User Admin',          'Manages user accounts and user profiles'),
    ('Interior Designer',   'Manages company information and IDP portfolio'),
    ('Customer',            'Searches, views and saves IDPs'),
    ('Platform Manager',    'Manages IDP categories and views reports');

-- Story #24: visual media belonging to an Interior Design Project.
-- Stored as BLOBs for a self-contained SQLite class project; production would use object storage.
CREATE TABLE IF NOT EXISTS idp_media (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    idp_id          INTEGER NOT NULL REFERENCES idp(id) ON DELETE CASCADE,
    file_name       TEXT NOT NULL,
    mime_type       TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm')),
    file_size       INTEGER NOT NULL CHECK (file_size > 0),
    data            BLOB NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_idp_media_idp ON idp_media(idp_id);
