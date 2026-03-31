# Anonychat — P2P ID Marketplace Enhancement

## Current State

The app has a working P2P market tab (`P2PMarket.tsx`) with:
- Three tabs: Market, My Listings, My Trades
- Backend endpoints: `createListing`, `buyListing`, `markPaymentSent`, `confirmTrade`, `rejectTrade`, `cancelTrade`, `getActiveListings`, `getMyTrades`
- Basic buy flow: confirm → IBAN → proof → done
- Countdown timer on active trades (15 min)
- Listing status badges: Active/Locked/Sold/Cancelled

What is missing:
- Fake market pre-fill (empty market feels dead)
- Rarity display (normal/rare/ultra) with visual differentiation
- Admin listing indicators ("Official" tag, highlighted card)
- Trust indicators (Protected Trade, seller rating, completed trades count)
- Tags: Official / Limited / Locked
- Activity feed with live-feeling updates
- Ultra Drop countdown system (locked by default, shows "Next Drop" timer)
- AnonCash fee display on actions
- Seller type distinction (user vs admin)
- Screenshot upload in buy flow
- Admin panel (generate IDs, assign rarity, list on market)
- Visual: glowing border for ultra, fire icon for rare, highlighted card for admin

## Requested Changes (Diff)

### Add
- **Fake/seed market data**: 12 pre-built listings (mix of normal/rare/ultra, user/admin sellers). Always shown when market is empty or appended to real listings. Examples: +777 4839 9281 €10 normal, +777 2222 3333 €45 rare, +777 9999 0000 €120 ultra.
- **Rarity badges**: Normal (gray), Rare (orange 🔥), Ultra (purple diamond 💎) on each listing card.
- **Seller type**: Visual label — "Admin" (gold highlight) vs "User" (standard).
- **Tags**: "🔥 Official" (admin-only, gold), "Limited" (rare, orange), "Locked" (ultra not yet released, red).
- **Trust indicators**: "✔ Protected Trade", "✔ Secure Transfer", "✔ Verified System" shown on every listing. Seller rating (e.g. 4.8⭐) and completed trade count.
- **Activity feed**: Scrolling ticker at top of Market tab showing live-feeling events: "🔥 +777 7777 7777 sold for €120", "⚡ New rare ID listed", "👤 User bought ID". Rotates automatically every 3 seconds.
- **Ultra Drop System**: Ultra listings default to LOCKED state, showing countdown timer "Next Drop: HH:MM:SS". When countdown reaches zero, button becomes enabled (BUY NOW).
- **AnonCash fee display**: Show "This action costs 1 AC" on create listing and "Transfer fee: 0.5 AC" on buy flow.
- **Screenshot upload step**: In buy flow Step 4, allow optional image upload for payment proof.
- **Admin panel**: Accessible from Market tab header for admin users — can generate new IDs with rarity, enter IBAN, and list them on market.
- **Create listing form**: Inputs for price (€), IBAN, and "List My ID" button with 1 AC listing fee warning.
- **Visual enhancements**: Ultra cards get animated glowing purple/cyan border. Rare cards get orange 🔥 accent. Admin cards get gold border highlight.
- **Trade in progress UI**: When a listing is locked/in trade, show "Trade in progress" badge and disable BUY button.

### Modify
- **P2PMarket.tsx**: Complete enhancement of the existing component. Keep all backend API calls intact. Merge fake listings with real listings. Replace basic listing cards with rich cards.
- **Buy flow**: Extend from 4 steps to 6 steps: (1) Confirm+Lock, (2) Show IBAN+Reference (admin vs user IBAN), (3) I Sent Payment, (4) Screenshot Upload, (5) Awaiting Seller Confirmation, (6) Transfer complete.
- **Market tab header**: Add activity feed ticker above listing cards.
- **My Listings tab**: Show existing listings + create listing form with AnonCash fee.
- **My Trades tab**: Keep existing, improve layout.

### Remove
- Nothing removed — only enhancement.

## Implementation Plan

1. Define `FAKE_LISTINGS` array: 12 static objects with id, anonymousId, price, rarity, sellerType (admin/user), sellerIban, sellerRating, completedTrades, tags, nextDropTime (for ultra).
2. Build `ActivityFeed` component: array of 8 preset messages, rotate with `setInterval` every 3 seconds, smooth fade/slide animation.
3. Build `RarityBadge` component: renders colored badge based on rarity.
4. Build `SellerBadge` component: renders admin (gold) or user (gray) badge.
5. Build `ListingCard` component: full rich card with ID, price, rarity, tags, trust indicators, seller info, BUY NOW button. Glowing animation for ultra via CSS keyframes.
6. Build `UltraDropCountdown` component: displays countdown timer for locked ultra listings; auto-unlocks when timer reaches zero (frontend-only, visual).
7. Enhance `BuyFlowSheet`: extend to 6 steps with screenshot upload in step 4. Conditionally show admin IBAN vs seller IBAN.
8. Build `AdminPanel` modal: input fields for ID generation (manual or auto), rarity selector, price, IBAN. Calls `createListing` backend. Only shown when user has admin role.
9. Merge logic: `getActiveListings` result merged with `FAKE_LISTINGS` — real listings shown first, fakes padded at bottom. If real listings empty, show all fakes.
10. AnonCash fee banners: small info bar on create listing form ("1 AC listing fee") and buy flow step 2 ("0.5 AC transfer fee").
11. Trust bar: fixed 3-item bar at bottom of every listing card.
