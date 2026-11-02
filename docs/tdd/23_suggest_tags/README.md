# TDD steps for #23 Suggest IDP Tags

Tests: `tests/Tag.test.js`, `tests/AIService.test.js`, `tests/SuggestTagsController.test.js` (20 tests).
The real code in `backend/` is **v3**. Each folder below is a copy of the same three files at one TDD step.

| Version | What it has | Result |
|---|---|---|
| `v1_no_function` | classes and methods exist, bodies are empty | 0 pass / 20 fail |
| `v2_no_validation` | main flow + AI-failure fallback, no invalid data checks | 8 pass / 12 fail |
| `v3_final` | everything, including invalid data checks | 20 pass / 0 fail |

## Try a version (run from the project root)

PowerShell:
```powershell
Copy-Item -Recurse -Force docs/tdd/23_suggest_tags/v1_no_function/backend/* backend/
node --test tests/Tag.test.js tests/AIService.test.js tests/SuggestTagsController.test.js
```

Change `v1_no_function` to `v2_no_validation` or `v3_final` for the other steps.

**Always copy `v3_final` back when you are done**, before committing.
