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
