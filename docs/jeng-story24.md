# User Story #24 — Upload visual media

**BCE:** `IDPMediaPage` (Boundary) → `MediaUploadController` (Control) → `IDP` / `IDPMedia` (Entity).

Designer media page: `/idp-media.html`. Public gallery: `/idp-gallery.html?idpId=...`.

API: `GET /api/idps/mine`, `GET/POST /api/idps/:idpId/media`, `DELETE /api/idps/:idpId/media/:mediaId`, `GET /api/idps/media/:mediaId/file`.

Image types JPEG/PNG/GIF/WebP (5 MiB), video MP4/WebM (8 MiB). SQLite BLOB storage is demo-only.

Test: `tests/MediaUploadController.test.js`. PlantUML diagrams under `docs/diagrams/jeng-story24-*.puml`.

**Security note:** The repository's `X-User-Id` header is spoofable; this is for a course demo, not production authentication.
