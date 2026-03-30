# Anonychat

## Current State
Full-stack anonymous chat app with: anonymous IDs (+777 XXXX XXXX), real-time messaging, random chat matching, voice messages, P2P ID trading, premium ID selection, QR code friend-adding, and Discover tab. Backend is Motoko on ICP. Frontend is React/Tailwind. Navigation: Chat, Random, Discover, P2P, Profile (5 tabs).

## Requested Changes (Diff)

### Add
- AnonCash in-app currency system
- Referral code system (each user's referral code = their anonymousId)
- Level 1 reward: referred user sends 5+ messages → +1 AnonCash (24h delay)
- Level 2 reward: 5 qualified Level 1 referrals → +10 AnonCash (24h delay)
- Level 3 reward: referred user calls buyPremium → +50 AnonCash (24h delay)
- Anti-cheat: 24h reward delay, daily 100 AC cap, no self-referral, one referrer per user
- New Earn tab (6th nav item) with balance, referral code, level progress, pending rewards, claim UI
- `buyPremium()` backend endpoint for L3 trigger
- New Motoko types: RewardLevel, RewardStatus, PendingReward, ReferralStats

### Modify
- main.mo: Add referral types, state, helper functions, referral endpoints; track message count in sendMessage to trigger L1 reward
- App.tsx: Add "Earn" (Kazan) tab to bottom navigation
- backend.d.ts: Add PendingReward, ReferralStats types

### Remove
- Nothing removed

## Implementation Plan
1. Backend (main.mo):
   - Add RewardLevel, RewardStatus, PendingReward, ReferralStats types
   - Add referral state maps (referralCodes, referredBy, userReferrals, anonCashBalance, pendingRewardMap, userPendingRewardIds, level1Issued, level2Issued, level3Issued, dailyEarnings, userMsgCount)
   - Add constants: REWARD_DELAY_NS (24h), DAILY_EARN_CAP (100), ACTIVE_MSG_THRESHOLD (5)
   - Add helper funcs: appendPrincipalArr, appendNatArr, addPendingRewardToUser, checkAndIssueReferralReward
   - Modify sendMessage to increment userMsgCount and call checkAndIssueReferralReward at threshold=5
   - Add public funcs: generateReferralCode, getReferralCode, useReferralCode, getAnonCashBalance, getPendingRewards, claimReward, getReferralStats, buyPremium
2. Frontend:
   - Add PendingReward, ReferralStats types to backend.d.ts
   - Create EarnTab.tsx: balance display, referral code card, level progress, claimable/pending rewards list, how-it-works section
   - Update App.tsx: add Earn tab type, nav item, and render
