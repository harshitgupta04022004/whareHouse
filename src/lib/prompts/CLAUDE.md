# Utility & Offline Prompts

Prompts for building offline support, caching, file upload, and PDF generation utilities.

## Files in This Directory
1. `09-offline-queue-caching-ux.md` — Offline queue, IndexedDB, cache invalidation
2. `10-do-documents-drive-upload-ui.md` — Google Drive file upload integration
3. `13-service-worker-caching.md` — Service worker, cache-first strategies
4. `14-do-print-pdf.md` — DO print and PDF generation

## Context
These prompts build on:
- `store.ts` (this directory: `../store.ts`) — data access layer
- `types.ts` (this directory: `../types.ts`) — TypeScript interfaces
- `utils.ts` (this directory: `../utils.ts`) — formatting helpers
- Google Drive API (`../../api/prompts/10-google-drive-files-api.md`)
- Files table (`../../database/prompts/08-files-table-drive-metadata.md`)

## Browser APIs Used
- Service Worker: [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- IndexedDB: [MDN IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- Cache API: [MDN Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- localStorage: [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)


---

# Imported Prompts

## 09-offline-queue-caching-ux.md

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


---

## 10-do-documents-drive-upload-ui.md

# Prompt 10 — DO Documents Upload & Drive File UI

## Role
Frontend for attaching scanned docs to DOs via Google Drive (metadata in `files` table).

## Problem Statement
Users upload invoice/receipt images/PDFs against a DO. UI:
- Drag-and-drop + file picker (`accept` PDF/JPEG/PNG)
- Progress via [XMLHttpRequest upload progress](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload) or fetch + UX indeterminate if unavailable
- List files from `files` with open-in-Drive link
- Category default `document`; enforce size limits from backend
- Audit shows `upload_file`

## Visual Decisions
- Drop zone with mist border; avoid card clutter. Color Hunt paper background.
- Show MIME + size humanized.

## Connections
- Drive API + folder structure: `backend/10`, `database/08`
- Production secrets for Google SA: `production/03`
- Rate limit: 10 uploads/min — surface 429 `retryAfter`

## Acceptance Criteria
- [ ] Upload disabled offline unless queued (Prompt 09)
- [ ] RLS-safe: only own warehouse files listed
- [ ] Accessible drop zone (keyboard activate)


---

## 13-service-worker-caching.md

# Prompt 13 — Service Worker, Caching Strategy & localStorage

## Role
Frontend engineer implementing the full Browser Caching Strategy from database.md.

## Problem Statement
database.md defines a detailed caching architecture. Implement it layer by layer.

### Service Worker Registration
```typescript
// In layout.tsx or a dedicated SW registration script
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log('SW registered:', reg.scope);
  });
}
```

### Cache Strategies by Resource Type (from database.md)
| Resource | Strategy | Rationale |
|----------|----------|-----------|
| App Shell | Cache First | Instant load on repeat visits |
| API Data | Network First | Always fresh data |
| Static Assets | Cache First | No changes between deploys |
| Images | Stale While Revalidate | Show cached, update in background |
| User DOs | Network Only | Always current data |

### IndexedDB Schema (warehouseCacheDB)
| Object Store | Key | Data | TTL | Max |
|--------------|-----|------|-----|-----|
| doCache | doId | Full DO + Items | 5 min | 500 |
| itemsCache | itemId | Item details | 10 min | 200 |
| productSummary | productName | Summary data | 5 min | 100 |
| usersCache | userId | User profile | 1 hour | 50 |
| pendingSync | UUID | Queued operations | Until synced | Unlimited |
| appShell | URL | HTML/CSS/JS | 1 year | 50 |

### localStorage Schema
```javascript
// User preferences
{
  "theme": "light",
  "language": "en",
  "lastWarehouse": "wh_001",
  "dashboardLayout": "grid",
  "itemsPerPage": 25
}

// Recently accessed (quick navigation)
{
  "recentDOs": ["do_001", "do_002", "do_003"],
  "recentItems": ["item_1", "item_4"],
  "lastViewed": "2026-08-07T10:00:00"
}
```

### Cache Invalidation Rules
| Event | Cache to Invalidate |
|-------|---------------------|
| Create DO | `doList_{warehouseId}` |
| Update DO | `doList_{warehouseId}`, `do_{doId}` |
| Delete DO | `doList_{warehouseId}` |
| Add Item | `itemsList_{warehouseId}` |
| Login | All caches → clear + rebuild |
| Logout | All caches → clear completely |
| Switch Warehouse | All warehouse-specific → clear + rebuild |

### Cache Size Management
- Old DOs (> 30 days) removed from cache
- Stale entries (> 1 hour) purged on app start
- Max 500 DOs cached per warehouse
- Max 200 items cached per warehouse
- Pending sync queue: no limit
- Admin "Clear Cache" button in settings

### Network-Aware Caching
```javascript
const conn = navigator.connection;
if (conn?.effectiveType === '4g') {
  strategy = 'network-first';
  cacheTTL = 60000;
} else if (conn?.effectiveType === '3g') {
  strategy = 'stale-while-revalidate';
  cacheTTL = 300000;
} else {
  strategy = 'cache-first';
  cacheTTL = 600000;
}
```

### Performance Targets (from database.md)
| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1s |
| Largest Contentful Paint | < 2s |
| Time to Interactive | < 1.5s |
| API Response (cached) | < 50ms |
| API Response (network) | < 200ms |
| Offline Load | < 500ms |

## Connections
- Frontend offline queue (`frontend/09`) uses pendingSync store
- Production CSP/headers (`production/04`)
- Cache monitoring (`production/05`) tracks hit rates

## Acceptance Criteria
- [ ] Service worker registered and active
- [ ] App shell cached on first load
- [ ] IndexedDB stores configured with correct TTLs
- [ ] Cache invalidation fires on mutations
- [ ] localStorage stores user preferences
- [ ] Recently accessed DOs available for quick nav
- [ ] Network-aware strategy adapts to connection speed


---

## 14-do-print-pdf.md

# Prompt 14 — DO Print / PDF Generation

## Role
Frontend engineer building printable Delivery Order documents.

## Problem Statement
Warehouse staff need to print DOs for physical delivery. Generate clean, printable DO PDFs.

### Print Layout
- A4 paper format
- Header: warehouse name, DO number, date
- Direction badge: IN (भीतर आना) / OUT (बाहर जाना)
- Party name (if set)
- Creator name
- Items table: sequence, item name, bags, bag_size, total_weight
- Footer: item_count, total bags, generated timestamp
- Optional: company logo/letterhead area

### Implementation Options
1. **CSS print stylesheet** (`@media print`) — simplest, browser-native
2. **react-pdf** or **@react-pdf/renderer** — programmatic PDF generation
3. **Puppeteer/Playwright** — server-side PDF (for Drive upload)

### Print Trigger
- "Print" button on DO detail/edit page
- Uses `window.print()` for CSS print approach
- Or calls API to generate PDF for Drive upload

### Generated DO PDF → Drive
- PDF generated server-side
- Uploaded to Drive folder: `DOs/{do_number}.pdf`
- File metadata stored in `files` table with category `do_pdf`
- Audit logged as `upload_file`

### Visual Design
- Clean, professional layout (no fancy graphics)
- High contrast for printing (black text on white)
- Table borders for item rows
- Hindi + English for direction labels
- Signature line at bottom (for physical signing)

## Connections
- DO data from `backend/03`/`backend/04`
- Drive upload from `backend/10`
- Files table `database/08`
- Admin can print any DO; staff can print own DOs

## Acceptance Criteria
- [ ] Print layout renders correctly on A4
- [ ] All DO fields present (number, date, direction, party, items)
- [ ] PDF generates without errors
- [ ] Generated PDF uploads to Drive DOs/ folder
- [ ] File metadata stored in files table


---

