# TDD steps for #23 Suggest IDP Tags

Tests: `tests/IDP.test.js`, `tests/AIService.test.js`, `tests/SuggestTagsController.test.js` (29 tests).
Code under test (4 files):

- `database/presetTags.js`: `loadPresetTags()` reads the preset styles / types from `database/tags.txt`
- `backend/entity/IDP.js`: `getTagsByType`, `findByNames`, `matchByKeywords`
- `backend/boundary/AIService.js`: `requestTags(description, styleNames, typeNames)` (Gemini; tests use a fake client)
- `backend/controller/SuggestTagsController.js`: `suggestTags(description)`, `keepOneStyle(tags)`

The real code is **v3**. Each folder below is a copy of the same four files at one TDD step.

| Version | What it has | Result |
|---|---|---|
| `v1_no_function` | classes and methods exist, bodies are empty | 0 pass / 29 fail |
| `v2_no_validation` | main flow + AI-failure fallback, no invalid data checks | 17 pass / 12 fail |
| `v3_final` | everything, including invalid data checks | 29 pass / 0 fail |

The 12 tests that fail in v2 are the invalid data cases:

| Invalid data | Test |
|---|---|
| no API key | `requestTags fails when there is no API key` |
| AI answers in the wrong shape | `requestTags fails when the AI answer is not { style, types }` |
| `tags.txt` saved with Windows line endings | `loadPresetTags accepts Windows (CRLF) line endings` |
| a preset name with no keywords | `loadPresetTags gives an empty keyword list to names without a Keywords line` |
| unknown / duplicate names | `findByNames drops unknown names and duplicates` |
| not a list | `findByNames returns an empty list when it is not given a list` |
| part of a word (`bar` in `barbecue`) | `matchByKeywords only matches whole words` |
| empty / `null` / number description (entity) | `matchByKeywords returns an empty list for empty or invalid descriptions` |
| AI finds no style (`style: null`) | `keeps the types and asks for a style when the AI finds no style` |
| AI suggests names outside the preset list | `discards names that are not in the preset list` |
| AI suggests only invalid names | `falls back to keyword matching when the AI suggests no valid names` |
| empty / `null` / number description (controller) | `rejects an empty description and does not call the AI` |

## Try a version (run from the project root)

PowerShell:
```powershell
Copy-Item -Recurse -Force docs/tdd/23_suggest_tags/v1_no_function/* .
node --test tests/IDP.test.js tests/AIService.test.js tests/SuggestTagsController.test.js
```

Change `v1_no_function` to `v2_no_validation` or `v3_final` for the other steps.

**Always copy `v3_final` back when you are done**, before committing.
