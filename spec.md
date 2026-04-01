# Anonychat P2P Professional Enhancements

## Current State
P2PMarket.tsx (2918 lines) has a full P2P marketplace with fake listings, buy flow, trade chat, seller ratings, escrow UI, admin system, rarity filters, activity feed, and AnonCash fees. Backend (main.mo) has trade state machine with PENDING/WAITING_PAYMENT/CONFIRMED/COMPLETED/CANCELLED states.

## Requested Changes (Diff)

### Add
1. **KYC Layered Trust System** — 4 trust levels shown on seller cards and profile:
   - Level 0: Anonymous (0–4 trades) — gray badge
   - Level 1: Trusted (5–19 trades) — blue badge
   - Level 2: Experienced (20+ trades + calculated long membership) — gold badge
   - Level 3: Verified Seller "Onaylı Satıcı" — green badge with checkmark
   Admin sellers always show Level 3. Each level has a different max trade limit displayed.

2. **Trade Statistics Panel** — a stats card/section in the P2P tab (above or between tabs):
   - Total sales this week banner: "Bu hafta X ID satıldı 🔥"
   - Total sales count, average completion time, success/cancel ratio
   - Animated counter or mini bar chart
   - Data derived from fake + real trades

3. **P2P Dispute System** — when a trade is in PaymentSent or later state:
   - "Anlaşmazlık Aç" (Open Dispute) button on trade cards
   - Opens a dispute modal/sheet with: reason text, evidence upload (text only for now), submit button
   - Submitted disputes show "Dispute Submitted — Admin reviewing within 24h" status
   - Admin sees dispute badge on trade; can resolve with "Favor Buyer" or "Favor Seller" decision
   - Two-sided evidence: both buyer and seller can add their side
   - Trade status shows "⚠️ Disputed" when dispute is open

4. **Popular Currencies** — payment method selector in buy flow Step 2:
   - EUR €, USD $, GBP £, TRY ₺, USDT, BTC, ETH, BNB
   - Small currency icons/flags next to each
   - Selected currency shown on IBAN display step

5. **Popular Banks** — bank selector in listing creation and buy flow:
   - Turkey: Ziraat, Garanti BBVA, İş Bankası, Akbank, Yapı Kredi, Halkbank, Vakıfbank, Denizbank
   - Europe: Deutsche Bank, ING, Revolut, N26, Wise
   - International: SWIFT/BIC option
   - Bank logo icons (text-based emoji or letter icons)

### Modify
- Seller cards in FAKE_LISTINGS and real listings: show KYC level badge next to rating
- Trade cards in "My Trades" tab: add dispute button for eligible trades
- Buy flow Step 2: add currency selector
- Create listing form: add bank selector

### Remove
- Nothing removed

## Implementation Plan
1. Add KYC level helper function: `getKycLevel(tradeCount, joinedDaysAgo)` → returns level 0-3 with label/color
2. Add KYC badge component displayed on listing cards
3. Add `TradeStatsPanel` component above the tabs showing weekly banner + stats
4. Add `DisputeModal` component with reason/evidence form and dispute status display
5. Add dispute state to fake trades for UI demo
6. Add currency list constant and selector component for buy flow Step 2
7. Add bank list constant and selector for listing creation
8. Wire all into P2PMarket.tsx without breaking existing flows
