# Prompt 07 — Dashboard Aggregation Golden Fixtures

## Role
Build golden-file tests for the inventory matrix math — the core business logic.

## Problem Statement
Seed known DOs and verify the dashboard aggregation matches expected values.

### Fixture Data
Create this seed (all in same warehouse, same user):
```
DO-100: IN, 2026-08-01, Wheat, 10 bags × 50kg = 500kg
DO-101: IN, 2026-08-03, Wheat, 5 bags × 50kg = 250kg
DO-102: OUT, 2026-08-05, Wheat, 3 bags × 50kg = 150kg
DO-103: IN, 2026-08-02, Rice, 4 bags × 30kg = 120kg
DO-104: OUT, 2026-08-06, Rice, 2 bags × 30kg = 60kg
```

### Expected Results

**Date range 2026-08-01 to 2026-08-03:**
| Product | IN (range) | OUT (range) | Remaining (all time) |
|---------|-----------|------------|---------------------|
| Wheat | 750 kg | 0 kg | 600 kg |
| Rice | 120 kg | 0 kg | 60 kg |

**Date range 2026-08-05 to 2026-08-07:**
| Product | IN (range) | OUT (range) | Remaining (all time) |
|---------|-----------|------------|---------------------|
| Wheat | 0 kg | 150 kg | 600 kg |
| Rice | 0 kg | 60 kg | 60 kg |

**Full range 2026-08-01 to 2026-08-07:**
| Product | IN (range) | OUT (range) | Remaining (all time) |
|---------|-----------|------------|---------------------|
| Wheat | 750 kg | 150 kg | 600 kg |
| Rice | 120 kg | 60 kg | 60 kg |

### Edge Cases to Test
- Product with only IN, no OUT → remaining = total_in
- Product with only OUT, no IN → remaining = negative (or zero if clamped)
- Product with zero transactions → remaining = 0
- Bag size change after historical lines → remaining bags use CURRENT bag_size from items table (document this behavior)
- Empty warehouse → all zeros

### Test Method
- Seed SQL fixtures
- Call dashboard API with date ranges
- Assert exact numeric values (not approximations)
- Store expected values as JSON fixture files

## Connections
- `backend/06` (dashboard API), `database/06` (views)
- `frontend/06` (dashboard UI)

## Acceptance Criteria
- [ ] All fixture scenarios pass with exact numbers
- [ ] Edge cases documented with expected behavior
- [ ] Fixture SQL checked into `testing/fixtures/`
