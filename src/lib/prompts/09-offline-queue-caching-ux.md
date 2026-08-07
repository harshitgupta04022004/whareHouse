# Prompt 09 — Offline Banner, Mutation Queue & Cache Invalidation UX

## Role
Frontend engineer implementing the offline-first experience and cache invalidation from database.md.

## Problem Statement
Warehouse floors have flaky networks. The app must work offline and sync seamlessly.

### Online/Offline Detection
- Use `navigator.onLine` + `online`/`offline` events ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine))
- Also use `navigator.connection.effectiveType` for network-aware caching
- Show banner: "Offline — changes saved locally"

### Mutation Queue (IndexedDB)
- Store pending creates/updates in `pendingSync` object store
- Each queued operation: `{ id, type, endpoint, body, timestamp, retries }`
- On reconnect: flush queue in order, show progress
- Failed items: show error reason, allow manual retry
- Queue survives page refresh

### Cache Invalidation on Mutations
When a mutation succeeds, invalidate related caches:
| Mutation | Cache to Invalidate |
|----------|---------------------|
| Create DO | `doList_{warehouseId}` |
| Update DO | `doList_{warehouseId}`, `do_{doId}` |
| Delete DO | `doList_{warehouseId}` |
| Add Item | `itemsList_{warehouseId}` |
| Update Item | `itemsList_{warehouseId}`, `items_{itemId}` |
| Login | All caches → clear + rebuild |
| Logout | All caches → clear completely |
| Switch Warehouse | All warehouse-specific → clear + rebuild |

### Conflict Handling
- When server rejects a stale edit (concurrent modification)
- Show: "This record was modified by someone else. Please refresh."
- Never silently overwrite server data

### Queue UX
- Badge count on nav icon showing pending items
- Expandable panel showing queued operations
- "Sync Now" manual trigger button
- Auto-sync every 30 seconds when online

## Connections
- Backend idempotency keys (`backend/09`) prevent duplicate DOs on retry
- Service worker (`frontend/13`) handles app shell + asset caching
- Error system (`frontend/12`) maps queue failures to friendly messages
- Production CSP/headers (`production/04`)

## Acceptance Criteria
- [ ] Queue survives page refresh
- [ ] Visual queue count in shell
- [ ] Failed items retryable with error reason
- [ ] Cache invalidated on successful mutations
- [ ] Conflict detection shows refresh prompt
- [ ] Auto-sync runs when back online
