# Project Progress

## Current Sprint

S7 - Customer Transcript Editor

## Status

COMPLETED (frontend mock scope; physical-device and browser interaction not manually verified)

## Completed

- S1-S2: Customer Web/Mobile foundations, design system and application shells.
- S3: Login/Register UI with mock behavior; no real authentication.
- S4: Dashboard/Projects with searchable, filterable mock data.
- S5: New Project and local mock media upload; no file transfer or persistence.
- S6: Full-stack architecture, domain boundaries and proposed roadmap documented.

## S7 Completed

- Added a route-driven Customer Transcript Editor to Web and Mobile.
- Added a sample uploaded project with media metadata and entry links from Projects.
- Added ten timestamped sample segments per supported source language.
- Centralized mock get/generate/save latency, validation and in-memory saved drafts in a replaceable service.
- Added per-segment edits, empty/whitespace validation, dirty/saved feedback and reset.
- Added loading, generating, empty and retryable error states.
- Kept Translation disabled until S8; no real STT, translation or backend work.

## Web

- Transcript Route: YES (`/projects/:projectId/transcript`)
- Generate Transcript: YES (mock)
- Timestamp Segments: YES
- Editing: YES
- Save: YES (in-memory only)
- Dirty State: YES
- Media Preview: NO playable URL; media information card is shown instead
- Responsive: YES (two columns on desktop, one on narrow screens)

## Mobile

- Transcript Screen: YES (`/projects/[projectId]/transcript`)
- Generate Transcript: YES (mock)
- Timestamp Segments: YES
- Editing: YES
- Save: YES (in-memory only)
- Keyboard Handling: YES (`KeyboardAvoidingView`, `FlatList`, safe area)
- Expo Go Compatible: YES (SDK 57; no new native dependency)

## Data

- Transcript: MOCK, module-memory only; resets on app reload
- Speech-to-Text: NOT_INTEGRATED
- Backend: NOT_IMPLEMENTED

## Validation

### Web

- lint: PASS
- typecheck: PASS
- build: PASS
- test: NOT_AVAILABLE (no test script; pure utility and mock service flow checked directly)

### Mobile

- lint: PASS
- typecheck: PASS
- test: NOT_AVAILABLE (no test script; pure utility behavior checked directly)
- expo-doctor: PASS (21/21 checks)
- Expo Android export: PASS
- Expo development QR: PASS (`npx expo start --offline` showed Expo Go QR)

## Important Files

- `frontend-web/src/pages/TranscriptPage.tsx`
- `frontend-web/src/features/transcript/`
- `frontend-web/src/styles/transcript.css`
- `frontend-mobile/src/app/projects/[projectId]/transcript.tsx`
- `frontend-mobile/src/screens/TranscriptScreen.tsx`
- `frontend-mobile/src/features/transcript/`
- `docs/UI.md`
- `docs/API.md`

## Known Issues

- Browser clicks/responsive rendering and a physical Expo Go scan/keyboard interaction were not manually tested here.
- S5 mock upload does not retain a playable media URL, so S7 shows media information rather than playback.
- Mock transcript saves do not survive an app reload and do not update the static S4 project repository.
- On iOS, the App Store Expo Go version must match SDK 57; a compatible Expo Go build may be needed.

## Next

S8 - Customer Translation Editor (not started)
