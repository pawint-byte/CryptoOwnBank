# CryptoBroker Tracker - Design Guidelines

## Design Approach

**Selected Approach:** Modern Financial Dashboard (Design System)  
**References:** Robinhood's clarity, Coinbase's data presentation, Personal Capital's portfolio views  
**Principles:** Data clarity, scannable metrics, professional trustworthiness, efficient workflows

---

## Typography

**Font Stack:** Inter (primary), Roboto Mono (numbers/data)  
- **Headers:** 2xl-4xl, semibold-bold for page titles and section headers
- **Metrics/Numbers:** xl-3xl, mono font, medium weight for financial data
- **Body Text:** sm-base, regular weight for descriptions and labels
- **Data Tables:** sm, mono for numeric columns, regular for text columns
- **Labels:** xs-sm, medium weight, uppercase for input labels and category tags

---

## Layout System

**Spacing Units:** Tailwind units of 2, 4, 6, 8, 12, 16, 24  
**Container:** max-w-7xl for main content area  
**Grid System:** 
- Dashboard: 12-column responsive grid (4 cols on lg, 2 on md, 1 on mobile)
- Sidebar: 64px collapsed, 256px expanded (navigation)

---

## Component Library

### Navigation
- **Top Bar:** Full-width header with logo, quick stats, account menu, notification bell
- **Sidebar:** Collapsible left navigation with icons + labels (Dashboard, Transactions, Portfolio, Tax Reports, Integrations, Settings)
- **Breadcrumbs:** Show navigation path on complex screens

### Dashboard Components

**Metric Cards:**
- Prominent number display (total portfolio value, P&L, ROI)
- Comparison indicator (percentage change, time period)
- Compact layout: 4 cards across desktop, 2 on tablet, 1 on mobile
- Spacing: p-6, gap-4 between cards

**Transaction Table:**
- Fixed header with sortable columns (Date, Type, Asset, Amount, Price, Total, Gain/Loss)
- Alternating row treatment for scannability
- Pagination controls at bottom
- Action buttons (View Details, Edit) in last column
- Dense layout: py-3 for rows

**Charts Section:**
- Portfolio value over time (line chart)
- Asset allocation (donut chart)
- Performance comparison (bar chart)
- Grid layout: 2 charts side-by-side on desktop, stacked on mobile
- Chart height: h-80 for primary charts, h-64 for secondary

**Integration Cards:**
- Exchange/broker logo, connection status indicator
- Last sync timestamp
- Connect/Disconnect button
- Layout: grid-cols-3 on desktop, stacked on mobile

### Forms

**API Key Input:**
- Secure text input with visibility toggle
- Help text explaining where to find keys
- Test connection button
- Success/error feedback inline

**Tax Settings:**
- Radio buttons for FIFO/LIFO selection
- Checkbox options for wash sale rules
- Date range pickers for tax year
- Generate Report primary action button

**Account Settings:**
- Two-column form layout (label left, input right)
- Grouped sections (Profile, Security, Notifications, Preferences)
- Save changes sticky footer on mobile

### Data Visualization

**Charts (Chart.js):**
- Clean grid lines, minimal decoration
- Tooltips on hover with precise values
- Legend positioned top-right
- Responsive sizing
- Interactive elements: zoom, pan for time-series data

**Status Indicators:**
- Inline badges for connection status (Connected, Syncing, Error)
- Directional indicators for gains/losses (no color specified, use typography weight)

### Modals & Overlays

**Transaction Details:**
- Modal overlay with transaction breakdown
- Fee calculations, tax implications preview
- Close button top-right
- Actions: Edit, Delete (destructive action)

**Confirmation Dialogs:**
- Centered modal for critical actions (disconnect exchange, delete transactions)
- Clear primary/secondary action buttons
- Warning icon for destructive actions

---

## Page Layouts

### Dashboard (Landing After Login)
1. **Top Metrics Bar:** 4 key stats in grid
2. **Portfolio Chart:** Full-width performance graph
3. **Two-Column Section:**
   - Left: Recent transactions table (top 10)
   - Right: Asset allocation chart
4. **Quick Actions:** Connect exchange, Generate tax report buttons

### Transactions Page
1. **Filter Bar:** Date range, asset type, exchange filters
2. **Transaction Table:** Full-width with all columns
3. **Pagination:** Bottom center

### Portfolio Page
1. **Summary Cards:** Total value, allocation breakdown
2. **Asset List:** Table view with holdings, current value, P&L per asset
3. **Performance Charts:** Historical performance by asset class

### Tax Reports Page
1. **Settings Panel:** Tax year, calculation method selection
2. **Preview Table:** Calculated gains/losses by transaction
3. **Export Actions:** Download CSV, PDF buttons
4. **Year-over-Year Comparison:** Summary charts

### Integrations Page
1. **Connected Accounts Grid:** Cards showing active integrations
2. **Add New Integration:** Button to connect exchange/broker
3. **Sync Status:** Last update times, manual refresh option

---

## Interactions

**Minimal Animations:**
- Subtle fade-in for data loading states (opacity transition)
- Smooth sidebar collapse/expand (width transition, 200ms)
- Chart hover tooltips (no animation)
- Modal entry: fade + slight scale (150ms)

**Loading States:**
- Skeleton screens for data tables
- Spinner for chart rendering
- Progress indicators for sync operations

---

## Images

**No hero images** - This is a dashboard application. Use:
- Exchange/broker logos (small, 32px-48px) in integration cards
- Placeholder avatar for user profile
- Empty state illustrations for "No transactions yet" scenarios (simple, minimal line art)

---

## Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation throughout (tab order logical)
- Focus indicators on all form inputs and buttons
- Screen reader announcements for data updates
- Sufficient text contrast for financial data readability
- Consistent form input styling across all pages