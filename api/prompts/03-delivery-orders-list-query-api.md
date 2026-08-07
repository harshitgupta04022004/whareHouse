# Prompt 03 — Delivery Orders List & Filter API

## Role
Backend engineer implementing the paginated DO list API using indexes.

## Problem Statement
The DO list is the most-used API. It must be fast, correct, and respect RBAC.

### Endpoint
`GET /api/do?cursor=<string>&limit=<number>&startDate=<date>&endDate=<date>&direction=<IN|OUT>&partyId=<uuid>&q=<string>&userId=<uuid>`

### Query Logic
```sql
SELECT
  d.do_id, d.do_number, d.direction, d.date, d.item_count,
  d.party_id, p.name as party_name,
  d.user_id, u.name as creator_name,
  d.created_at, d.updated_at
FROM delivery_orders d
LEFT JOIN parties p ON p.party_id = d.party_id
LEFT JOIN app_users u ON u.user_id = d.user_id
WHERE d.warehouse_id = current_warehouse_id()
  AND d.date BETWEEN :startDate AND :endDate  -- if provided
  AND d.direction = :direction                 -- if provided
  AND d.party_id = :partyId                    -- if provided
  AND d.do_number ILIKE '%' || :q || '%'       -- if provided (text search)
  AND d.user_id = :userId                      -- if provided (admin only)
ORDER BY d.date DESC, d.created_at DESC
LIMIT :limit;
```

### Index Usage
- Primary filter: `idx_do_warehouse_date` on (warehouse_id, date DESC)
- Party filter: sequential scan (small dataset, acceptable)
- Text search on do_number: sequential scan (acceptable for 200/day)

### Staff Restriction
- Staff users can ONLY see their own DOs (`user_id = auth.uid()`)
- Admin/manager can see all DOs in warehouse
- Enforce server-side: if role=staff, ignore `userId` param and force `user_id = auth.uid()`

### DO Number
- DO number is a **manually entered string** by the admin (NOT auto-generated)
- Format is free-form: `DO-001`, `1234/25-26`, `CHL-2026/001`
- Text search uses `ILIKE` for case-insensitive partial match

### Pagination
- Cursor-based (not offset)
- Default limit: 20, max: 50
- Return: `{ items: [...], nextCursor: "...", hasMore: boolean }`

### Response Shape
```json
{
  "items": [
    {
      "do_id": "uuid",
      "do_number": "DO-001",
      "direction": "IN",
      "date": "2026-08-01",
      "item_count": 3,
      "party_name": "ABC Suppliers",
      "creator_name": "Rahul",
      "created_at": "2026-08-01T10:00:00Z",
      "updated_at": "2026-08-01T10:00:00Z"
    }
  ],
  "nextCursor": "2026-07-31T23:59:59Z",
  "hasMore": true
}
```

## Connections
- Frontend DO list (`frontend/03`)
- RBAC middleware (`backend/02`)
- Staff filtering enforced server-side
- Caching: short TTL or no-cache (real-time data)

## Acceptance Criteria
- [ ] Uses `idx_do_warehouse_date` index (verify with EXPLAIN)
- [ ] Staff cannot see other users' DOs
- [ ] Admin/manager can filter by userId
- [ ] Cursor pagination stable under concurrent inserts
