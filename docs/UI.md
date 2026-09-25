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

- Implemented UI: Login, Register, Dashboard, Projects, New Project / mock Upload, Customer Transcript Editor (S7).
- Existing placeholders: History and Settings.
- Planned Customer UI: Translation Editor (S8), Voice/TTS (S9), Generate/Processing (S10), Result and History completion (S11), Profile completion later.

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
- Generated/saved transcripts live only in mock service memory for the current app session. No STT provider, backend or persistent media exists. Continue to Translation remains disabled with an S8 explanation.
