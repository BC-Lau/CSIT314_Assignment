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
| Save IDP to favourites (#6) | Save button on IDP cards (home page, Recommended IDPs) | Customer |

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
