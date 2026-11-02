# How to add a feature (follow this format)

Every user story is built the same way, so the code matches the B-C-E diagrams.
Use **#13 Create IDP** as the example to copy.

| Step | Layer | File | Example (#13) |
|---|---|---|---|
| 1 | Database | `database/schema.sql` | `idp`, `idp_tag` tables |
| 2 | Entity | `backend/entity/<Name>.js` | `IDP.js`, `Tag.js` |
| 3 | Test first (TDD) | `tests/<Name>.test.js` | write the test, see it fail |
| 4 | Controller | `backend/controller/<Action>Controller.js` | `CreateIDPController.js` |
| 5 | Route | `backend/routes/<area>Routes.js`, registered in `backend/app.js` | `POST /api/idps` |
| 6 | Boundary | `frontend/js/boundary/<Page>.js` + `frontend/<page>.html` | `IDPFormPage.js`, `idp-create.html` |
| 7 | Dashboard link | `frontend/js/boundary/DashboardPage.js`: set `ready: true` and `href` | |
| 8 | Seed data | `database/seed.js` (at least 100 rows per table) | |

## Rules
- **Method names = sequence diagram names.** If you rename one, update the diagram too.
- **Entity** classes are the only place with SQL. Always use `?` placeholders, never string concatenation.
- **Controller** methods return `{ success: true, ... }` or `{ success: false, message }`. They never touch `req` / `res`.
- **Routes** only read the request, call one controller method, and send the result.
  Get the user with `userAccount.findById(req.get('X-User-Id'))` and pass it to the controller.
- **Permissions** use inheritance: add a `canXxx()` method to `UserAccount` that returns `false`,
  override it in the subclass that is allowed (e.g. `InteriorDesigner`), and check it first in the controller.
- **Boundary** classes draw text with `textContent` or `el()`; never put user data into `innerHTML`.
- Tests use an in-memory database: `createTestDatabase()` from `tests/helpers.js`.
- Run `npm test` before pushing (`sync.bat` does this for you).
