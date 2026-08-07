# Prompt 12 — Error Boundaries, Loading Skeletons & Empty States

## Role
Frontend engineer implementing the resilience and polish layer for all pages.

## Problem Statement
The app must handle errors, loading, and empty states gracefully across every screen.

### React Error Boundary
Create a reusable `ErrorBoundary` component (class or `react-error-boundary`):
- Catches render errors in child components
- Shows friendly error UI: "Something went wrong" + error message + "Try again" button
- Logs error to Sentry or console for debugging
- Does NOT crash the entire app — only the affected section
- Per [MDN Error Handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)

### Loading Skeletons
Every data-fetching screen needs skeleton placeholders:
- DO list: table row skeletons (5 rows)
- Dashboard: matrix cell skeletons
- Items/Parties: list item skeletons (8 items)
- Audit: log row skeletons (10 rows)
- Use CSS `@keyframes` shimmer animation on skeleton blocks
- Match the layout of actual content (height, width, spacing)

### Empty States
When data is legitimately empty:
- DO list with no DOs: "No delivery orders yet. Create your first DO."
- Items with no items: "No items added. Add your first product."
- Dashboard with no data: "No inventory movements in this period."
- Audit with no logs: "No audit entries yet."
- Each empty state has a CTA button linking to the relevant create screen

### Error Toast System
- Success: green toast, auto-dismiss 3s
- Error: red toast, manual dismiss, includes error message
- Warning: amber toast, auto-dismiss 5s
- Info: blue toast, auto-dismiss 3s
- Use `aria-live="polite"` for screen reader announcements

### Network Error Handling
- Fetch failures → show "Connection error. Please check your network."
- Timeout → show "Request timed out. Please try again."
- 403 → show "You don't have permission for this action."
- 429 → show rate limit message from `backend/09`
- 500 → show "Something went wrong. Please try again later."

## Connections
- Used by every frontend prompt (01–10)
- Backend error responses (`database.md` § Error Handling) map to these UI states
- Offline banner from `frontend/09` integrates with this error system

## Acceptance Criteria
- [ ] Error boundary catches and displays render errors
- [ ] Every list page has a skeleton loader
- [ ] Every list page has an empty state with CTA
- [ ] Toast system announces to screen readers
- [ ] Network errors mapped to friendly messages
