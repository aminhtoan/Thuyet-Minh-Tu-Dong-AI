# Project Progress

## Current Sprint

S16 Admin Languages, Voices, Logs & Settings

## Status

COMPLETED (Admin frontend + in-memory mock services)

## Implemented

- `/languages`: summary, voice counts, search/status filter, add/edit validation and enable/disable confirmation.
- `/voices`: summary, combined filters, add/edit/enable/disable and honest TTS preview fallback.
- `/logs`: read-only search/category/role/time filters, pagination and detail dialog.
- `/settings`: general/upload/processing/narration/system sections, validation, dirty save and reset.
- Six languages, 12 related voices, 27 activity logs and centralized mock settings.
- Loading/error/empty states, responsive forms/tables/dialogs and service-owned latency/mutations.
- No primary Admin sidebar destination remains a placeholder.

## Architecture / Boundaries

- Language → Voice relationships share one catalog store.
- Logs are read-only and contain no invented secrets/IP/stack traces.
- Settings are session-only; no localStorage, real runtime effects or secret fields.
- No backend, API calls, JWT/RBAC, providers or database.

## Validation

- Lint: PASS, no warnings.
- Typecheck/build: PASS (92 modules).
- Unit/service tests: PASS.
- Dev server/browser smoke: PASS across S12–S16, six viewport widths and S16 interactions.
- No runtime exceptions or API requests.
- Customer Web/Mobile frozen hash: PASS.

## Important Files

- `admin-web/src/pages/AdminLanguagesPage.tsx`, `AdminVoicesPage.tsx`
- `admin-web/src/pages/AdminLogsPage.tsx`, `AdminSettingsPage.tsx`
- `admin-web/src/types/system.ts`, `mocks/adminSystem.mock.ts`
- `admin-web/src/services/adminLanguageService.ts`, `adminVoiceService.ts`
- `admin-web/src/services/adminLogService.ts`, `adminSettingsService.ts`
- `admin-web/src/styles/system.css`

## Known Limitations

- All mutations reset on reload.
- Voice preview has no audio until a real TTS service exists.
- Settings do not affect Customer clients or runtime infrastructure.

## Next

S16.5 Admin UI Polish + Full Frontend Regression, then S17 Backend Foundation.
