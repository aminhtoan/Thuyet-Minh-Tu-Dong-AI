# Admin UI foundation — S31.ADMIN.UI.1

Tokens live in `src/styles/admin-tokens.css`, scoped to `.admin-shell`.
`admin-shell.css` imports the tokens and shared primitive styles. Login and other
applications retain their own styles. Existing semantic status colors are retained.

Reuse existing Button, Card, Badge/StatusBadge, Icon and AdminPageHeader. New
primitives fill gaps; do not build parallel page-specific copies:

- `FormFields`: SearchField / FilterSelect require a label; optionally hide it visually.
- `Pagination`: bounded page window, accepts existing API pagination objects.
  OperationPagination remains a compatible adapter; CustomerTable uses it directly.
- `DataTable`: native thead/tbody children, required caption, keyboard-scrollable
  overflow region, optional minWidth. It does not implement sorting or fetch data.
- `LoadingState`: keep toolbar and children mounted during refresh. Put initial
  skeleton/empty/error inside the result region, never replace the search toolbar.
- `ErrorState`: reuses EmptyState/Button, optional retry; EmptyState accepts action.
- `AdminDialog`: controlled open/onClose, labelledBy, optional describedBy/busy;
  native showModal handles modality, Tab containment and Escape. Cleanup restores
  the connected opener. Busy prevents Escape dismissal. Caller supplies title and
  close/cancel actions. ConfirmStatusDialog is the first existing consumer.

UI.2 must integrate DataTable/LoadingState into page layouts before claiming
search focus preservation across network requests. Legacy table typography and
per-page styles are intentionally not mass-overridden; new DataTable uses 14px.
Do not change routes, labels, queries, permissions or API contracts in this stage.
DefinitionList is deferred until multiple pages actually need the same contract.

Validation: `npm run typecheck`, `npm run lint`, `npm run build`, and
`node --test tests/admin-foundation.test.mjs tests/foundation.test.mjs`.
Browser acceptance remains separate: native Tab/Escape/focus return, 375/768/
1024/1440px, 200% zoom, long labels, and reduced motion. No real account or API
mutation is needed for component acceptance.
