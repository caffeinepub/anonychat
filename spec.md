# Anonychat

## Current State
Full P2P ID marketplace with fake+real listings, 6-step buy flow, IBAN payment, escrow-style ID locking (backend), trade state machine, AnonCash fees, activity feed, admin panel, rarity system.

Missing professional exchange features:
- Seller rating/review system (stars + comments visible on listings)
- Escrow status UI (visual trust that ID is held by system)
- Trade Chat (buyer ↔ seller private messages during active trade)

## Requested Changes (Diff)

### Add
- `TradeReview` backend type: tradeId, reviewerPrincipal, targetPrincipal, stars (1-5), comment, createdAt
- `TradeMessage` backend type: id, tradeId, senderPrincipal, senderAnonId, content, createdAt
- Backend endpoints: `submitTradeReview`, `getSellerReviews`, `sendTradeMessage`, `getTradeMessages`
- Stable storage: `tradeReviews`, `tradeMessages`, `tradeMessageIdCounter`, `reviewIdCounter`
- Frontend: Trade Chat sheet panel (opens from active trade card)
- Frontend: Rating modal (opens after trade confirmed/completed)
- Frontend: Seller stars + review count displayed on listing cards
- Frontend: Escrow status badge ("🔒 ID in Escrow" during active trade)

### Modify
- P2PMarket.tsx: listing cards show star rating + trade count
- P2PMarket.tsx: active trade cards show Trade Chat button + Escrow badge
- P2PMarket.tsx: completed trades show "Rate Seller" button
- backend.d.ts: add new types for reviews and trade messages

### Remove
- Nothing removed

## Implementation Plan
1. Add TradeReview + TradeMessage types to main.mo
2. Add stable storage vars
3. Add backend endpoints (submitTradeReview, getSellerReviews, sendTradeMessage, getTradeMessages)
4. Update backend.d.ts bindings
5. Update P2PMarket.tsx:
   - Listing cards: star rating display
   - Active trade: Escrow badge + Trade Chat button
   - Trade Chat sheet: message list + send input, polling every 3s
   - Rating modal: 1-5 stars tap + optional comment, submit after trade done
