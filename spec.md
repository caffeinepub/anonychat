# Anonychat — IBAN + Alternative Payment P2P System

## Current State

The app has a fully working P2P ID marketplace (P2PMarket.tsx) with:
- Listing creation, fake listings, admin/user listings, rarity system
- Buy flow with IBAN payment (admin IBAN: LT913130010131376235), 15-min countdown
- Seller rating, KYC trust levels, trade chat, dispute system
- Multi-currency/bank support
- Admin panel (AdminPanel.tsx) with dispute resolution, user freeze
- Backend (main.mo) with all P2P endpoints: createListing, buyListing, markPaymentSent, confirmTrade, rejectTrade, cancelTrade, getActiveListings, getMyTrades, openDispute, resolveDispute, getAllTradesAdmin, getAllUsersAdmin, freezeUser, getAdminDashboard

## Requested Changes (Diff)

### Add
- **Seller Payment Settings** (Profile → Payment Settings section): seller can add multiple payment methods per PAYMENT OBJECT: `{ type: 'iban'|'revolut'|'wise'|'zen', account_name, iban?, phone_or_tag?, bank_name?, country }`
- **Accepted Countries selector** in Payment Settings: seller picks which countries they accept (NL, DE, TR, GB, RU, BY + more)
- **Smart Matching Engine**: when buyer opens Market, detect buyer's country (via browser/geolocation or manual selection) and preferred payment method; only show listings where buyer.country ∈ seller.accepted_countries AND payment method is compatible
- **PaymentSettingsModal** component: full UI for managing multiple payment methods (add/edit/remove), accepted countries multi-select
- **Buyer country/payment preference selector** on Market page (top bar): "Your country" + "Preferred method" filters
- **Enhanced listing cards**: show payment method icons (IBAN, Revolut, Wise, Zen), supported country flags/codes ("NL / DE / TR"), trust badges (Fast Seller ⚡, Trusted ✅, New ⚠️)
- **Smart trade screen**: when buyer clicks BUY, auto-select best payment method based on buyer country + speed preference; show ONLY matched method details (IBAN details OR fintech @tag/phone)
- **Anti-scam warning banner**: "Only send money to the payment shown here" on trade screen
- **Fallback state**: if no listings match buyer's region/method, show "No compatible payment method for your region" empty state
- **Instant sellers filter** + **Same country only toggle** in Market filters
- **Trust badges** computed from trade stats: Fast Seller ⚡ (avg response < 5min), Trusted ✅ (success rate > 95%), New ⚠️ (< 5 trades)

### Modify
- P2PMarket.tsx: add country filter bar at top, integrate smart matching to filter shown listings, update listing cards to show payment method icons + country codes, update buy flow to auto-select matched payment method
- Profile/App.tsx: add "Payment Settings" entry that opens PaymentSettingsModal
- Backend (main.mo): add `setPaymentMethods`, `getPaymentMethods`, `setAcceptedCountries`, `getAcceptedCountries` endpoints; store seller payment methods and accepted countries in stable vars

### Remove
- Nothing removed — all existing features preserved

## Implementation Plan

1. **Backend**: Add stable vars for seller payment methods (HashMap Principal → [PaymentMethod]) and accepted countries (HashMap Principal → [Text]). Add query/update endpoints: `setPaymentMethods`, `getPaymentMethods`, `setAcceptedCountries`, `getAcceptedCountries`.
2. **PaymentSettingsModal.tsx**: New component. Form to add payment method (type selector: IBAN/Revolut/Wise/Zen, fields change based on type). List of existing methods with delete. Country multi-select with flags.
3. **Smart matching in P2PMarket**: Add buyer country/method state at top. Filter fake + real listings based on match. Show fallback if empty. Add "Instant only" + "Same country" toggles.
4. **Enhanced listing card**: payment method icons row, country code chips, trust badge (computed from seller stats).
5. **Trade screen update**: detect best payment method for buyer, show only relevant details (IBAN block vs fintech block), show anti-scam warning.
6. **Profile integration**: add Payment Settings button that opens PaymentSettingsModal.
7. **Validate**: lint + typecheck + build.
