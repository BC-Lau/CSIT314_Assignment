# CSIT314_Assignment

Online platform matching renovation customers to interior designers.
Design follows the **Boundary-Control-Entity (B-C-E)** framework.

## Tech stack
- Node.js (>= 22.13) + Express
- SQLite (Node built-in `node:sqlite`, no extra install)
- Tests: Node built-in test runner (`node --test`)
- CI: GitHub Actions (`.github/workflows/ci.yml`)

## Getting started
```
npm install
npm run seed      # rebuilds database/app.db with random test data
npm start         # http://localhost:3000
npm test
```
Demo accounts (password `password123`): `designer1`, `customer1`, `manager1`, `admin`.

## Pages
| Page | File | Who |
|---|---|---|
| Home (latest IDPs) | `frontend/index.html` | everyone |
| Log in | `frontend/login.html` | everyone |
| Dashboard (options per profile) | `frontend/dashboard.html` | logged in |
| Create IDP | `frontend/idp-create.html` | Interior Designer |
| Recommended IDPs (#1) | `frontend/recommendations.html` | Customer |
| Filter IDPs (#2) | `frontend/filter-idps.html` | Customer |
| Save IDP to favourites (#6) | Save button on IDP cards (home page, Recommended IDPs) | Customer |
| My favourites (#7) | `frontend/my-favourites.html` | Customer |

## Folder structure
```
backend/
  entity/       ENTITY classes  (data + database access)
  controller/   CONTROL classes (application logic, one per user story)
  routes/       HTTP endpoints that connect boundary -> controller
  utils/        password hashing
  app.js, server.js
frontend/
  js/boundary/  BOUNDARY classes (one per page)
  js/common.js  shared API + navigation helpers
  *.html, css/
database/       schema.sql, db.js, seed.js, presetTags.js + tags.txt (preset styles / types)
tests/          unit tests (*.test.js)
docs/           diagrams, guides (see docs/HOW_TO_ADD_A_FEATURE.md)
```

## Sync with GitHub
Double-click `sync.bat` (pull -> run tests -> commit -> push).

## User Story #24 — Media upload
See [Story #24 implementation guide](docs/jeng-story24.md).


## Suspicious activity moderation

User Admins can open **Dashboard → Suspicious activity** to review automatically flagged customer accounts and IDPs.

The current rule-based checks flag customer accounts for missing email addresses, URL-like or repeated-character usernames, or email addresses shared by multiple accounts. IDPs are flagged when their content contains external URLs or solicitation/payment-related terms, is unusually long, or repeats another IDP title by the same designer. These are review signals, not proof of abuse; a User Admin can accept a flag without restricting the item.

Pending flags can be accepted, suspended, or removed. Suspended entries can also be reactivated directly from the moderation queue; reactivation clears the corresponding flag. The separate **Dashboard → Manage IDPs** inventory provides the same suspend, remove, and reactivate lifecycle controls for every project. Removing a customer account is implemented as a deactivation (rather than a hard database delete) so related consultation and activity records remain intact. Removing an IDP deletes the listing while preserving the moderation record. Suspending a designer from an IDP flag deactivates the designer account and marks all of their IDPs as suspended. Suspended IDPs are excluded from public listing, filtering, and recommendations.
