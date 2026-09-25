# UI Specification

## Design

- Modern AI SaaS
- Clean, minimal, professional
- Blue/white with a soft gray background
- Rounded cards and subtle shadows
- Clear typography, consistent spacing and accessible contrast

## Customer Web (`frontend-web/`)

Desktop layout: Sidebar + Topbar + Main Workspace.

Desktop tận dụng multiple columns, editor lớn và sidebar navigation.

## Customer Mobile (`frontend-mobile/`)

Mobile layout: Header + Single-column Content + Bottom Navigation khi phù hợp.

Không copy desktop layout trực tiếp sang mobile.

## Customer Screen Status

- Implemented UI: Login, Register, Dashboard, Projects, New Project / mock Upload, Customer Transcript Editor (S7), Customer Translation Editor (S8), Customer Voice & TTS Configuration (S9), Customer Generate & Processing (S10).
- Existing placeholders: History and Settings.
- Planned Customer UI: Result and History completion (S11), Profile completion later.

## Admin Web (`admin-web/`, future)

Admin Web is a **separate application**, not a route or component section inside Customer Web. It begins in S12 and does not exist yet. Planned screens: Admin Login, Admin Dashboard, Customers, Projects, Processing Jobs, Languages, Voices, Activity Logs and business/application Settings. No Admin UI is implemented in S6.

## Component Inventory and Future Patterns

- Implemented shared patterns: Button, Input, Card, Badge, Spinner, ProgressBar, EmptyState, ErrorState, PageHeader/Sidebar/Topbar on Web, and header/tab navigation on Mobile.
- Later patterns as needed: Select, Modal, Dialog and Toast.
- Implemented project-specific patterns: ProjectCard, filters and status badges.

## Implemented Design System

### Foundations

- Matching Web and Mobile color, spacing, radius and typography tokens
- Soft gray application background, white surfaces and blue primary palette
- Responsive spacing, accessible contrast and restrained shadows

### Common Components

- Button: primary, secondary, ghost and danger variants; disabled and loading states
- Input: label, helper, error, required and disabled states
- Card and Badge
- Spinner and ProgressBar
- EmptyState and ErrorState

### Web Application Shell

- Persistent desktop Sidebar with active route highlighting
- Responsive navigation drawer for tablet and mobile widths
- Sticky Topbar, user placeholder and reusable PageHeader
- Login and Register screens remain outside the application shell

### Mobile Application Shell

- Expo Router tab navigation for Dashboard, Projects, History and Settings
- Safe-area-aware MobileHeader and scrollable screen container
- New Project remains a stack route outside the tab bar

Dashboard and Projects are implemented with development mock data.

## Authentication UI

### Web

- Responsive split-screen `AuthLayout` shared by Login and Register
- Accessible email and password controls with inline field/form errors
- Password visibility controls and loading submit states

### Mobile

- Native Login and Register layouts with Safe Area handling
- Keyboard-avoiding, scrollable forms with mobile keyboard configuration
- Accessible password visibility controls and inline validation

Authentication uses a short mock UI flow only. Backend authentication and persistent sessions are not connected.

## Dashboard and Projects

### Web

- Responsive Dashboard statistics and recent-project list
- Projects page with combined local search and status filtering
- Desktop project rows collapse into readable cards on smaller screens

### Mobile

- Two-column statistics and native project cards on Dashboard
- FlatList-based Projects screen with search and horizontally scrollable filter chips
- Dashboard and Projects CTAs navigate to the implemented New Project screen

### Project Components

- `StatCard`, `ProjectCard`, `ProjectStatusBadge` and project filters
- Friendly language pairs, relative update dates and processing progress
- Separate empty states for no project data and no matching results

Project screens use clearly marked development mock data. Backend project APIs are not connected.

## New Project and Media Upload (S5)

- Web `/projects/new`: project name, source language, accessible browse input, drag-and-drop with active state, validated file card, video/audio preview, and upload progress.
- Mobile `/projects/new`: project name, source-language chips, Expo Document Picker for existing video/audio, validated metadata card, and upload progress. Keyboard avoidance and safe areas are supported.
- Both frontends support cancel, retry, success and error states. Upload is simulated locally; no media is sent or persisted. Continue returns to Projects; the sample uploaded project opens the S7 Transcript Editor.

## Customer Transcript Editor (S7)

- Web `/projects/:projectId/transcript`: two-column media information and timestamped segment editor, collapsing to one column on narrow screens. A mock project without a playable URL shows honest media metadata rather than a broken video/audio player. The segment list has an internal scroll area on desktop.
- Mobile `/projects/[projectId]/transcript`: single-column FlatList with timestamped multiline inputs, KeyboardAvoidingView and safe-area padding; no new native media dependency.
- Both clients load by route `projectId`, generate ten development-only sample segments, allow correction/reset/save, validate empty text, show dirty/saved/loading/error/empty states and offer retry. Full text is derived from segments on save.
- Generated/saved transcripts live only in mock service memory for the current app session. No STT provider, backend or persistent media exists. Continue to Translation is enabled only for a valid, saved transcript with no pending edits.

## Customer Translation Editor (S8)

- Web `/projects/:projectId/translation`: source language, labelled target selector excluding the source, and paired Original/Translation rows sharing the same segment timestamps. Rows stack on narrow screens.
- Mobile `/projects/[projectId]/translation`: accessible target-language choices, single-column segment cards, multiline translation inputs, FlatList and keyboard avoidance.
- Both clients require a saved S7 transcript, show read-only source text, generate deterministic samples, validate empty/whitespace text, and support save/reset plus loading/empty/error/retry states.
- Language changes are disabled while dirty. Reset restores the last saved translation, or discards an initial unsaved generation. Back to Transcript asks before discarding pending edits.
- Saved translations are separate per project/language and live only in module memory. Source ID/sequence/timing are preserved; changing the saved transcript invalidates older translations.
- Vietnamese-to-English S7 samples have matching English copy. Other languages use deterministic mock copy; edited source text gets an explicitly labelled sample. No provider is called.
- Continue to Voice/TTS opens the saved target-language context only when the translation is valid and has no pending edits.

## Customer Voice & TTS Configuration (S9)

- Web `/projects/:projectId/voice?language=en`: saved translation language/segment/character summary, first two translated segments, active voice cards, gender filtering and optional name search. Three-column cards collapse to two and then one column.
- Mobile `/projects/[projectId]/voice`: target language is passed with the project ID, single-column FlatList cards, gender filters, comfortable Preview/Select actions and speed presets from 0.5x to 2.0x.
- One selected voice is stored by ID. Selected cards show a text/check indicator. Inactive or unrelated-language voices are never selectable.
- Preview is explicitly labelled as simulation with no audio. Only one preview runs at a time; Stop, switching previews, filtering, saving and unmount cancel its timer. Failures support retry.
- Web uses a labelled speed range (0.5–2.0, step 0.1); Mobile uses existing buttons with 0.5/0.75/1.0/1.25/1.5/2.0 presets. No new native package is required.
- Both clients validate voice/language/speed, show configuration and dirty/saved state, save to mock memory and reset to the last saved values (or empty voice/default speed initially).
- Back to Translation preserves target language and warns before discarding pending configuration. A changed saved translation invalidates older narration configuration.
- Loading, unavailable translation, empty voice catalog, unmatched filters and retryable failures are supported. WorkflowSteps is shared with S7/S8.
- Continue to Generate opens S10 only when configuration is valid, saved and unchanged. Project ID and target language are preserved. Real TTS is NOT_INTEGRATED and narration audio is NOT_GENERATED.

## Customer Generate & Processing (S10)

- Web `/projects/:projectId/generate?language=en` and Mobile `/projects/[projectId]/generate` load the saved S9 configuration. Missing/invalid settings show a Voice Settings action; loading and load failures are explicit.
- Generation Summary shows project/media, source/target languages, transcript/translation segment counts, voice and speed. Edit Translation/Edit Voice preserve language. A review checkbox confirms settings before Generate Video (Generate Audio for audio-only projects).
- Shared WorkflowSteps highlights Generate. Upload/Transcript/Translation/Voice start completed; only Narration Generation and Video Processing (Audio Processing for audio source) are simulated.
- Overall progress averages the two remaining stages; percentages are finite and clamped to 0–100. Reusable ProcessingStage supports status text/icons and optional progress for future indeterminate tasks.
- Default processing is deterministic and succeeds. The service owns all timers; synchronous start locking prevents double starts. Start/retry revalidate saved settings.
- During STARTING/PROCESSING, Generate and settings edits are unavailable. Cancel stops immediately. Navigation/unmount disposes the session; Mobile also cancels on blur. Browser refresh warns during processing.
- Failed state identifies stage/reason and offers retry. Retry/restart resets both stages to 0 and removes stale errors/timers. Completed state says simulation complete and explicitly states that no output file exists.
- View Result is disabled with a next-step explanation; S11 is not implemented. Reloading clears mock saved data; navigating away discards this processing session.
- Web summary/pipeline columns become one column below 950px. Mobile uses the existing scrollable screen, safe-area layout and accessible progress components without native dependencies.
- Failure testing: set `features/processing/mockProcessingScenario.ts` → `failFirstAttemptAt` to `start`, `narration` or `media` in the desired client. A new session fails once at that stage; retry succeeds by default. Service `start/retry({ failAt })` can test repeated failures.
- Regression checks: from `frontend-web`, run `node scripts/verify-processing.mjs` for both clients. Optional `node scripts/verify-processing-browser.mjs` requires Vite at 127.0.0.1:5175 and a separate temporary Chrome profile with remote debugging at 127.0.0.1:9223. No test framework is installed.
