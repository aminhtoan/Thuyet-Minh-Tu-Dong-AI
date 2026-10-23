# Expo SDK 57 → 58 — 2026-10-24

Scope: frontend-mobile only plus upgrade documentation. No Customer Web/Backend/
Admin edits, UI redesign, production API call, database access or attempt mutation.

## Official references

- https://expo.dev/blog/how-to-upgrade-to-sdk-58
- https://docs.expo.dev/versions/v58.0.0/
- https://docs.expo.dev/router/migrate/sdk-57-to-58/
- https://reactnative.dev/docs/strict-typescript-api
- SDK58 SecureStore, FileSystem legacy, Audio and Video reference pages reviewed.

## Installed versions

| Package | Before | After installed |
|---|---|---|
| expo | 57.0.27 (declared ~57.0.27) | 58.0.17 (^58.0.0) |
| react / react-dom | 19.2.3 | 19.3.0 |
| react-native | 0.86.3 | 0.88.0 |
| expo-router | 57.0.25 | 58.0.25 |
| expo-asset | ~57.0.19 | 58.0.18 |
| expo-audio | ~57.0.5 | 58.0.10 |
| expo-constants | ~57.0.19 | 58.0.13 |
| expo-document-picker | ~57.0.3 | 58.0.4 |
| expo-file-system | ~57.0.7 | 58.0.10 |
| expo-font | ~57.0.4 | 58.0.9 |
| expo-linking | ~57.0.12 | 58.0.14 |
| expo-secure-store | ~57.0.4 | 58.0.2 |
| expo-sharing | ~57.0.22 | 58.0.20 |
| expo-status-bar | ~57.0.1 | 58.0.4 |
| expo-video | ~57.0.5 | 58.0.12 |
| react-native-safe-area-context | ~5.7.0 | 5.10.1 |
| react-native-screens | ~4.26.0 | 4.30.0 |
| react-native-web | ^0.21.2 | 0.21.4 |
| @types/react | ~19.2.2 | 19.3.0 |
| eslint-config-expo | ~57.0.2 | 58.0.4 |
| @expo/vector-icons | ^15.0.2 | 15.1.1 (same range) |
| typescript | ~6.0.3 | 6.0.3 (unchanged) |

Node22.23.3/npm10.9.9 used. No beta/canary, force, legacy-peer-deps or Strict API
opt-out used. package-lock.json records installed SDK58 dependencies.

## Installation and fixes

1. Ran requested `npx expo install expo@^58.0.0 --fix` with dotenv/telemetry off.
   Expo installed, but old Router57 optional peer tree caused ERESOLVE. Aligned
   React types/eslint-config-expo with Expo's expected versions.
2. Preserved old lockfile/dependencies in ignored `.expo` before rebuilding.
   Windows Move-Item hit long-path errors and split the old dependency tree;
   old files were retained, not source/native data deleted. Backup resides under
   `.expo/sdk57-backup/node_modules` (partial old tree); do not treat it as a
   complete reinstallable app. Lock backup `.expo/sdk57-package-lock.json`.
3. npm install rebuilt the SDK58 tree; package-lock-only repaired missing
   transitive lock entries, then `npm ci` succeeded. Missing ansi-escapes from the
   intermediate tree resolved by clean install. Final installed/lock/native SDK
   version policy checks all PASS.
4. Router58 removed initialRouteName prop: removed it from Tabs, preserved
   Dashboard as the first declared tab and all existing tab hrefs/guards.
   Module-level router is used only in existing callbacks; no custom navigator,
   deep React Native import or removed API found in application source.
5. app.json explicitly keeps Expo Web SPA output (`single`) and web asyncRoutes
   false, avoiding an unintended rendering/navigation change. Customer Web/Vite
   is not affected. Root native header remains hidden; no iOS header redesign.
6. RN0.88 strict FlatList slots reject null: use undefined for absent empty/footer
   content in Projects/Transcript/Translation/Voice. Same conditions and handlers;
   no `any`, no disabled type validation.
7. ESLint config excludes generated exports/.expo/dependencies. A test's computed
   namespace access now uses object copies, satisfying the new Expo ESLint rules
   without changing the parity assertions.
8. SecureStore key/session revision/refresh remain unchanged; legacy upload task,
   cancel/progress and File/Directory picker staging kept. useAudioPlayer,
   useVideoPlayer and native video controls remain supported and unchanged.

No android/ios directories exist; none created, reset or deleted. No native
prebuild, EAS build, device login, media upload, AI generation or TTS performed.

## Validation

| Check | Result |
|---|---|
| expo-doctor@latest (1.21.5) | 20/20 PASS after clean installation |
| expo install --check | PASS: dependencies up to date |
| npm ci | PASS |
| npm run typecheck | PASS, including existing design:check |
| Mobile tests | 64/64 PASS (four SDK58 regression tests included) |
| ESLint src/tests/config using Expo flat config | PASS |
| npm run lint / Expo CLI wrapper | NOT COMPLETED: wrapper hangs in this environment; stopped own run. Unsandboxed retry was not executed because approval reviewer hit usage limit. |
| Metro/Hermes Android export | PASS:1319 modules |
| Metro/Hermes iOS export | PASS:1327 modules |
| Export assets | 37; bundles present under dist-sdk58-validation |
| git diff --check | PASS |
| Android Expo Go58 / device visual QA | NOT VERIFIED: no connected device/app |

Export was offline with EXPO_NO_DOTENV=1, EXPO_NO_TELEMETRY=1. No app runtime or
Backend requests were started. Bundling is not a native runtime acceptance test.

Security: targeted in-range update moved transitive shell-quote1.10.0→1.12.0,
removing the critical audit finding. Latest audit during this upgrade still had
five high findings: Expo CLI/code-signing chain, node-forge and zod. Do not run
audit fix --force (it proposed an incompatible Expo downgrade). ESLint9 also emits
an upstream support/deprecation notice. SDK58 Doctor reports no dependency issues;
these security advisories remain a separate unresolved limitation.

## Manual next checks (not executed)

Run `npm run lint` in a normal local terminal. Confirm Expo Go installed on Android
supports SDK58, then start Metro manually with `npx expo start --clear`. Verify
login/logout and protected routes, dashboard/default tab, existing project reads,
picker cancellation and audio/video controls. Do not submit upload/generation/
TTS or mutate old attempts without separate authorization. Native QA pending,
not automatically PASS based on exports.

No commit/push. Existing unrelated changes preserved; no further UI sync stage.
