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
