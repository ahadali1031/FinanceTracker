# Finance Tracker — Implementation Plan & Progress

## Tech Stack
- **Frontend**: Expo (React Native + Web) with Expo Router, TypeScript
- **Database**: Firebase (Firestore + Auth)
- **State**: Zustand
- **Charts**: Victory Native (@shopify/react-native-skia)
- **Stock API**: Alpha Vantage (free, 25 req/min), CoinGecko (crypto)
- **Date utils**: date-fns

---

## Phase 1: Foundation ✅
- [x] Init Expo project with Router + TypeScript
- [x] Firebase client config (`src/lib/firebase.ts`)
- [x] Tab navigator: Dashboard, Transactions, [+], Invest, Settings
- [x] Root layout with auth gate (redirects to login if not signed in)
- [x] Login screen (Anonymous + Google sign-in)
- [x] Base UI components: Card, Button, Input, AmountInput, CategoryPicker, EmptyState
- [x] TypeScript types matching Firestore schema (`src/types/index.ts`)
- [x] Zustand stores: auth, expense, income, subscription, investment, savings, budget
- [x] Utility functions: currency formatting, date helpers, category constants
- [x] Alpha Vantage stock API wrapper with caching (`src/lib/stock-api.ts`)
- [x] Dark/light mode support throughout

## Phase 2: Expenses & Income ✅
- [x] Transactions tab — combined expenses + income list, grouped by date, month selector
- [x] Summary cards: monthly income, monthly expenses, net cash flow
- [x] Add Expense modal — amount (comma formatting), category picker, description, editable date
- [x] Edit Expense screen — pre-filled form, update & delete
- [x] Income management screen (accessible from Transactions income card)
- [x] Add Income modal — amount (comma formatting), source, description, editable date, recurring toggle
- [x] Delete for both expenses and income (web: window.confirm, native: Alert)
- [x] Center "+" tab button with AddActionSheet (quick add: expense, income, subscription, savings, investment)
- [x] Dashboard wired to live Firestore data (net worth, monthly totals, subscriptions)
- [x] Future-dated transactions only affect net worth on their date
- [ ] Monthly expense bar/pie chart by category (moved to Phase 5 with charts)

## Phase 3: Subscriptions ✅
- [x] Subscription list — sorted by next billing date, active/inactive toggle
- [x] Summary cards: monthly total, yearly total
- [x] Active count + upcoming renewals indicator (next 7 days)
- [x] Add Subscription form — name, amount (comma formatting), frequency (monthly/yearly), category, start date, optional end date
- [x] Edit subscription detail screen — update all fields
- [x] Delete subscription (web: confirm, native: Alert)
- [x] Toggle active/inactive with Switch
- [x] Auto-calculate nextBillingDate from startDate + frequency
- [x] Category-colored accent bars + icons

## Phase 4: Investments 🔲
- [ ] Investment accounts list — name, type badge, institution, total value
- [ ] Add investment account (name, type, institution)
- [ ] Account detail — holdings list, transactions list
- [ ] Add holding (ticker, shares, cost basis)
- [ ] Buy/sell transaction form — ticker, type, shares, price, date
- [ ] Alpha Vantage integration — live stock quotes for holdings
- [ ] CoinGecko integration — live crypto prices
- [ ] Holdings view with current prices, gain/loss ($, %)
- [ ] Recurring investments (auto-add on set day with live prices)
- [ ] Employer match option for 401k contributions
- [ ] DRIP handling via "Reinvested" toggle on dividend transactions
- [ ] Portfolio allocation donut chart

## Phase 5: Savings, Dashboard Charts & Budget 🔲
- [ ] Savings accounts list — name, institution, latest balance, emergency fund badge
- [ ] Add savings account
- [ ] Account detail — balance history (snapshots)
- [ ] Add balance snapshot (balance + date)
- [ ] **Net Worth Dashboard Charts**:
  - [ ] Area chart with gradient fill + time range selector (1M/3M/6M/YTD/1Y/All)
  - [ ] Change indicators: $ change + % change (green/red)
  - [ ] Touch-scrub for exact value + date tooltip
- [ ] **Monthly Expenses Charts**:
  - [ ] Donut chart (top 5 categories + Other), total in center
  - [ ] Horizontal bar list for comparison
  - [ ] Monthly bar chart comparing last 6 months
- [ ] **Budget Targets**:
  - [ ] Set monthly limit per category
  - [ ] Progress bars (green → yellow → red)
  - [ ] Summary: total spent, remaining, vs last month
- [ ] **Investment Portfolio Charts**:
  - [ ] Donut chart for allocation (by holding, by account type)
  - [ ] Line chart for performance over time
- [ ] **Sankey Chart (Net Worth flow)**:
  - [ ] D3.js sankey via react-native-webview (Expo compatible)
  - [ ] Visualize: income sources → expense categories / savings / investments
  - [ ] Interactive nodes and links

## Phase 6: Polish 🔲
- [ ] Dark mode / theming refinement
- [ ] Error handling and edge cases
- [ ] Loading states and skeletons
- [ ] Cross-platform testing (iOS, Android, web)
- [ ] Animations and transitions polish

---

## Future Features (not in initial build)
- [ ] **Firebase AI (Gemini) integration** — auto-categorize expenses, natural language entry, financial insights, subscription detection, budget recommendations
- [ ] Plaid integration for auto-pulling bank balances
- [ ] Debt tracking
- [ ] Emergency fund tracker with goal
- [ ] Tax-deductible tags on expenses
- [ ] CSV export
- [ ] Subscription renewal reminders (push notifications)
- [ ] Recurring expense templates

---

## Deployment
- **Web**: Firebase Hosting — `npx expo export:web` + `firebase deploy`
- **iOS**: EAS Build → TestFlight
- **Android**: EAS Build → Internal Testing

---

## Notes
- All forms default to today's date, editable to set future dates
- Future-dated transactions don't affect net worth until their date
- Path alias: `@/*` maps to project root
- Amount inputs show comma formatting (e.g. 5,000.00)
- Web uses window.confirm for delete, native uses Alert.alert
