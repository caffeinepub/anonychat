# Anonychat — ID Slot System

## Current State
Each user has exactly one anonymous ID generated at registration. No limit system exists. The backend `User` type has a single `anonymousId` field.

## Requested Changes (Diff)

### Add
- Backend: `stable let userOwnedIds` map (Principal → [Text]) tracking all IDs a user owns
- Backend: `stable let idLastActivity` map (Text → Int) for 30-day inactivity detection
- Backend: `stable let userPremiumSlots` map (Principal → Bool) for premium unlock
- Backend: `getIdSlotInfo()` query → returns `{ownedIds: [Text], maxSlots: Nat, referralBonus: Nat, activityBonus: Nat, isPremium: Bool}`
- Backend: `createAdditionalId()` — checks slot limit, generates new ID, adds to userOwnedIds
- Backend: `reclaimId(anonId: Text)` — marks ID as recycled (removes from userOwnedIds, frees slot)
- Backend: helper `getMaxSlots(caller)` — base(3) + referralBonus + activityBonus + premiumBonus(5), capped at 10
- Frontend: `IDSlotsWidget` component embedded in ProfileTab, below the ID card
- Frontend: Visual slot indicator with filled/empty dots
- Frontend: Unlock missions panel (invite progress, active usage, premium)
- Frontend: Inactive ID warning badge (30 days unused → show reclaim option)
- Frontend: "+ New ID" button when slots available

### Modify
- Backend: `register()` — also initializes `userOwnedIds` with the generated ID
- Frontend: ProfileTab — add `IDSlotsWidget` below the ID card section

### Remove
- Nothing

## Implementation Plan
1. Add backend slot management functions and stable vars
2. Update `register()` to populate `userOwnedIds`
3. Create `IDSlotsWidget.tsx` frontend component
4. Integrate into ProfileTab in App.tsx
5. Validate and build
