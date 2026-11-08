# TDD steps for #25 Connected Customers Metric

Tests: `tests/ContactRequest.test.js`, `tests/ConnectedCustomersController.test.js` (14 tests).
Code under test (2 files):

- `backend/entity/ContactRequest.js`: `countConnectedCustomers(startDate, endDate)`, `countByDesigner(startDate, endDate)`
- `backend/controller/ConnectedCustomersController.js`: `getConnectedCustomers(user, startDate, endDate)` (only a Platform Manager, checked with `user.canViewMetrics()`; "today" is injected, tests fix it to 2026-03-31)

The real code is **v3**. Each folder below is a copy of the same two files at one TDD step.

| Version | What it has | Result |
|---|---|---|
| `v1_no_function` | classes and methods exist, bodies are empty | 0 pass / 14 fail |
| `v2_no_validation` | entity queries + main flow (default 30 days, totals, "No contacts" message), no permission or date checks | 10 pass / 4 fail |
| `v3_final` | everything, including the permission and date checks | 14 pass / 0 fail |

The 4 tests that fail in v2 are the invalid data / invalid user cases:

| Invalid data | Test |
|---|---|
| user is not a Platform Manager (`null`, designer, customer) | `only a Platform Manager can view the metric` |
| start date after end date | `rejects a start date after the end date` |
| end date in the future | `counts only up to today when the end date is in the future` |
| not a real `YYYY-MM-DD` date (`abc`, `2026/03/01`, `2026-02-30`) | `rejects dates that are not real YYYY-MM-DD dates` |

## Try a version (run from the project root)

PowerShell:
```powershell
Copy-Item -Recurse -Force docs/tdd/25_connected_customers/v1_no_function/* .
node --test tests/ContactRequest.test.js tests/ConnectedCustomersController.test.js
```

Change `v1_no_function` to `v2_no_validation` or `v3_final` for the other steps.

**Always copy `v3_final` back when you are done**, before committing.

Note (11/7): `v3_final/backend/entity/ContactRequest.js` also has the two trend queries
(`countConnectedCustomersByPeriod`, `countByDesignerAndPeriod`) used by the extra trend chart
(`ConnectedCustomersTrendController`, tests in `tests/ConnectedCustomersTrendController.test.js`).
They are not part of the 14 TDD tests; they are in v3 only so that copying v3 back does not delete them.
