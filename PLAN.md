# Finance Tracker — Implementation Plan & Progress

## Tech Stack
- **Frontend**: Expo (React Native + Web) with Expo Router, TypeScript
- **Database**: Firebase (Firestore + Auth)
- **State**: Zustand
- **Charts**: Victory Native (@shopify/react-native-skia)
- **Stock API**: Alpha Vantage (free, 25 req/min)
- **Date utils**: date-fns

---

## Phase 1: Foundation ✅
- [x] Init Expo project with Router + TypeScript
- [x] Firebase client config (`src/lib/firebase.ts`) — placeholder config, user fills in
- [x] Firestore security rules (TBD — need to deploy to Firebase)
- [x] Tab navigator: Dashboard, Expenses, Investments, Subscriptions, Settings
- [x] Root layout with auth gate (redirects to login if not signed in)
- [x] Login screen (Anonymous sign-in for testing, Google OAuth placeholder)
- [x] Base UI components: Card, Button, Input, AmountInput, CategoryPicker, EmptyState
- [x] TypeScript types matching Firestore schema (`src/types/index.ts`)
- [x] Zustand stores: auth, expense, income, subscription, investment, savings, budget
- [x] Utility functions: currency formatting, date helpers, category constants
- [x] Alpha Vantage stock API wrapper with caching (`src/lib/stock-api.ts`)
- [x] Dark/light mode support throughout

## Phase 2: Expenses & Income ✅
- [x] Expenses tab — list with monthly grouping, month selector
- [x] Add Expense modal — amount, category picker, description, date (defaults to today)
- [x] Edit Expense screen — pre-filled form, update & delete
- [x] Income list screen
- [x] Add Income modal — amount, source, description, date (defaults to today), recurring toggle
- [ ] Monthly expense bar/pie chart by category (moved to Phase 5 with charts)

## Phase 3: Subscriptions 🔲
- [ ] Subscription list — sorted by next billing date, active/inactive toggle
- [ ] Summary card: monthly total, yearly total
- [ ] Upcoming renewals section (next 7 days)
- [ ] Add Subscription form — name, amount, frequency (monthly/yearly), category, start date, end date
- [ ] Edit/delete subscription
- [ ] Auto-calculate nextBillingDate from startDate + frequency

## Phase 4: Investments 🔲
- [ ] Investment accounts list — name, type badge, institution, total value
- [ ] Add investment account (name, type, institution)
- [ ] Account detail — holdings list, transactions list
- [ ] Add holding (ticker, shares, cost basis)
- [ ] Buy/sell transaction form — ticker, type, shares, price, date (defaults to today)
- [ ] Alpha Vantage integration — live stock quotes for holdings
- [ ] Holdings view with current prices, gain/loss ($, %)
- [ ] Portfolio allocation donut chart

## Phase 5: Savings & Dashboard 🔲
- [ ] Savings accounts list — name, institution, latest balance, emergency fund badge
- [ ] Add savings account
- [ ] Account detail — balance history (snapshots)
- [ ] Add balance snapshot (balance + date, defaults to today)
- [ ] **Net Worth Dashboard (home screen)**:
  - [ ] Area chart with gradient fill
  - [ ] Time range selector: 1M / 3M / 6M / YTD / 1Y / All
  - [ ] Hero stat: total net worth (large, bold)
  - [ ] Change indicators: $ change + % change (green/red)
  - [ ] Assets vs Liabilities breakdown bar
  - [ ] Touch-scrub for exact value + date tooltip
- [ ] **Monthly Expenses Charts**:
  - [ ] Donut chart (top 5 categories + Other), total in center
  - [ ] Horizontal bar list below for accurate comparison
  - [ ] Monthly bar chart comparing last 6 months
- [ ] **Budget Targets**:
  - [ ] Set monthly limit per category
  - [ ] Progress bars (green → yellow → red) with pacing line
  - [ ] Summary: total spent, remaining, vs last month
- [ ] **Investment Portfolio Charts**:
  - [ ] Donut chart for allocation (by holding, by account type)
  - [ ] Line chart for performance over time (1D/1W/1M/3M/1Y/All)
  - [ ] Holdings list: ticker, value, gain/loss, % of portfolio

## Phase 6: Polish 🔲
- [ ] Dark mode / theming refinement
- [ ] Error handling and edge cases
- [ ] Loading states and skeletons
- [ ] Cross-platform testing (iOS, Android, web)
- [ ] Animations and transitions

---

## Chart & Analytics Design Decisions

### Color System
| Purpose | Color |
|---------|-------|
| Brand/neutral, chart fills | Blue (#2f95dc) |
| Gains, income, under budget | Green (#34c759) |
| Losses, overspend, over budget | Red (#ff3b30) |
| Warning, approaching limit | Orange (#ff9500) |
| Categories | Distinct palette per category |

### Net Worth Chart
- Area chart with gradient fill (30% opacity → 0%)
- Time ranges: 1M / 3M / 6M / YTD / 1Y / All
- Based on manual snapshots (savings + investments - debts)
- Touch-scrub interaction for exact values

### Portfolio Allocation
- Donut chart with total value in center
- Combined view by default, filter by account
- Line chart for performance with time ranges

### Monthly Expenses
- Donut chart for at-a-glance category view
- Horizontal bars below for accurate comparison
- Monthly bar chart for 6-month trend
- Budget progress bars with pacing line

---

## Future Features (not in initial build)
- [ ] **Firebase AI (Gemini) integration** — auto-categorize expenses, natural language entry, financial insights, subscription detection, budget recommendations (@firebase/ai already installed)
- [ ] Plaid integration for auto-pulling bank balances
- [ ] Debt tracking
- [ ] Emergency fund tracker with goal
- [ ] Tax-deductible tags on expenses
- [ ] CSV export
- [ ] Subscription renewal reminders (push notifications)
- [ ] Recurring expense templates
- [ ] Google OAuth sign-in (replace anonymous auth)

---

## Deployment
- **Web**: Firebase Hosting — `npx expo export:web` + `firebase deploy`
- **iOS**: EAS Build → TestFlight
- **Android**: EAS Build → Internal Testing

---

## Notes
- All forms default to today's date
- Path alias: `@/*` maps to project root
- Firebase config needs real project credentials before Firestore works
