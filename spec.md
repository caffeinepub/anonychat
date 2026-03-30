# Anonychat — P2P ID Trading System

## Current State
Fully working anonymous chat app on ICP/Motoko with:
- Anonymous IDs (+777 XXXX XXXX), rarity levels, user registration
- Real-time messaging, voice messages, random chat matching
- Discover tab (online users, nearby users), QR code friend adding
- Notification badges, premium ID search (UI-only)
- Blob storage (MixinStorage) already included in backend
- 5 tabs: Chat, Random, Discover, Profile — bottom navigation

## Requested Changes (Diff)

### Add
- **P2P Market tab** — 6th tab in bottom navigation (or integrated as a tab)
- **P2P Listing data type** — id, sellerPrincipal, sellerAnonId, listedAnonId (ID being sold), price, iban, status (Active/Locked/Sold/Cancelled), createdAt
- **P2P Trade data type** — id, listingId, buyerPrincipal, buyerAnonId, sellerPrincipal, sellerAnonId, listedAnonId, price, status (Pending/PaymentSent/Confirmed/Rejected/Disputed/Cancelled), proofScreenshotHash, referenceNumber, createdAt, paymentSentAt
- **Backend endpoints**:
  - `createListing(price, iban)` — seller lists their own anonymousId for sale
  - `getActiveListings()` — query, all Active status listings
  - `getMyListings()` — query, caller's listings
  - `buyListing(listingId)` — locks listing, creates trade, returns trade with IBAN
  - `markPaymentSent(tradeId, referenceNumber, screenshotHash)` — buyer submits proof
  - `confirmTrade(tradeId)` — seller confirms → transfers ID to buyer, seller gets new random ID
  - `rejectTrade(tradeId)` — seller rejects → dispute status, listing unlocked
  - `cancelTrade(tradeId)` — cancel if 15 min expired or manual cancel (Pending only)
  - `getMyTrades()` — all trades where caller is buyer or seller
  - `cancelListing(listingId)` — seller cancels Active listing
- **Security**: listing locked during trade (prevents multiple buyers), auto-cancel after 15 minutes
- **ID Transfer**: on confirmTrade, buyer's anonymousId → listedAnonId, seller gets new random ID generated
- **Screenshot upload**: use existing blob-storage (MixinStorage) for payment proof screenshots

### Modify
- App.tsx — add P2P tab to bottom navigation
- backend.d.ts — add new P2P types and function signatures

### Remove
- Nothing removed

## Implementation Plan
1. Add P2P types (P2PListing, P2PTrade, ListingStatus, TradeStatus, P2PTradeView) to Motoko backend
2. Add listing/trade state maps (p2pListings, p2pTrades, counters)
3. Implement all P2P endpoints with proper auth/validation
4. Implement ID transfer logic (anonIdToPrincipal update, user record update)
5. Implement 15-minute expiry check in buyListing and markPaymentSent
6. Generate updated backend.d.ts with new types
7. Build P2PMarket.tsx component:
   - Browse tab: active listings grid
   - My Listings tab: seller's listings + create new listing form
   - My Trades tab: active/completed trades with countdown timer
8. Build trade flow modals:
   - BuyModal: confirm buy → show IBAN → payment sent form (ref number + screenshot upload)
   - SellerTradeModal: incoming trade notification → confirm/reject actions
9. Add countdown timer (15 min) for active trades
10. Integrate P2P tab in App.tsx navigation
