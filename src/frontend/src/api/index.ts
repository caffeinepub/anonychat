// API layer — thin typed wrapper over the Motoko actor.
// Components call api.method(actor, ...) instead of (actor as any).method(...)
// This eliminates scattered `as any` casts and makes refactoring safe.
import type { backendInterface } from "../backend.d";

export const api = {
  // User
  getMe: (actor: backendInterface) => actor.getMe(),
  register: (actor: backendInterface) => actor.register(),
  listUsers: (actor: backendInterface) => actor.listUsers(),
  setOnline: (actor: backendInterface, isOnline: boolean) =>
    actor.setOnline(isOnline),
  updateUsername: (actor: backendInterface, username: string) =>
    actor.updateUsername(username),
  findUserByAnonId: (actor: backendInterface, anonId: string) =>
    actor.findUserByAnonId(anonId),

  // Chat
  getConversation: (actor: backendInterface, otherAnonId: string) =>
    actor.getConversation(otherAnonId),
  sendMessage: (
    actor: backendInterface,
    receiverAnonId: string,
    content: string,
    isGhost: boolean,
  ) => actor.sendMessage(receiverAnonId, content, isGhost),
  deleteMessage: (actor: backendInterface, msgId: bigint) =>
    actor.deleteMessage(msgId),

  // Voice messages
  getVoiceMessages: (actor: backendInterface, otherAnonId: string) =>
    actor.getVoiceMessages(otherAnonId),
  sendVoiceMessage: (
    actor: backendInterface,
    receiverAnonId: string,
    audioHash: string,
    duration: bigint,
  ) => actor.sendVoiceMessage(receiverAnonId, audioHash, duration),

  // Block / report
  blockUser: (actor: backendInterface, anonId: string) =>
    actor.blockUser(anonId),
  unblockUser: (actor: backendInterface, anonId: string) =>
    actor.unblockUser(anonId),
  getBlockedUsers: (actor: backendInterface) => actor.getBlockedUsers(),
  reportUser: (actor: backendInterface, anonId: string, reason: string) =>
    actor.reportUser(anonId, reason),

  // Random chat
  joinMatchQueue: (actor: backendInterface) => actor.joinMatchQueue(),
  checkMatchStatus: (actor: backendInterface) => actor.checkMatchStatus(),
  leaveMatchQueue: (actor: backendInterface) => actor.leaveMatchQueue(),
  endRandomSession: (actor: backendInterface, sessionId: bigint) =>
    actor.endRandomSession(sessionId),
  getCurrentSession: (actor: backendInterface) => actor.getCurrentSession(),
  getRandomMessages: (actor: backendInterface, sessionId: bigint) =>
    actor.getRandomMessages(sessionId),
  sendRandomMessage: (
    actor: backendInterface,
    sessionId: bigint,
    content: string,
  ) => actor.sendRandomMessage(sessionId, content),
  sendRandomVoiceMessage: (
    actor: backendInterface,
    sessionId: bigint,
    audioHash: string,
    duration: bigint,
  ) => actor.sendRandomVoiceMessage(sessionId, audioHash, duration),
  getRandomVoiceMessages: (actor: backendInterface, sessionId: bigint) =>
    actor.getRandomVoiceMessages(sessionId),

  // P2P marketplace
  createListing: (actor: backendInterface, price: string, iban: string) =>
    actor.createListing(price, iban),
  getActiveListings: (actor: backendInterface) => actor.getActiveListings(),
  getMyListings: (actor: backendInterface) => actor.getMyListings(),
  cancelListing: (actor: backendInterface, listingId: bigint) =>
    actor.cancelListing(listingId),
  buyListing: (actor: backendInterface, listingId: bigint) =>
    actor.buyListing(listingId),
  markPaymentSent: (
    actor: backendInterface,
    tradeId: bigint,
    referenceNumber: string,
    screenshotHash: string,
  ) => actor.markPaymentSent(tradeId, referenceNumber, screenshotHash),
  confirmTrade: (actor: backendInterface, tradeId: bigint) =>
    actor.confirmTrade(tradeId),
  rejectTrade: (actor: backendInterface, tradeId: bigint) =>
    actor.rejectTrade(tradeId),
  cancelTrade: (actor: backendInterface, tradeId: bigint) =>
    actor.cancelTrade(tradeId),
  getMyTrades: (actor: backendInterface) => actor.getMyTrades(),
  getTrade: (actor: backendInterface, tradeId: bigint) =>
    actor.getTrade(tradeId),
  cancelExpiredTrades: (actor: backendInterface) => actor.cancelExpiredTrades(),

  // AnonCash / referral
  generateReferralCode: (actor: backendInterface) =>
    actor.generateReferralCode(),
  getReferralCode: (actor: backendInterface) => actor.getReferralCode(),
  useReferralCode: (actor: backendInterface, code: string) =>
    actor.useReferralCode(code),
  getAnonCashBalance: (actor: backendInterface) => actor.getAnonCashBalance(),
  getPendingRewards: (actor: backendInterface) => actor.getPendingRewards(),
  claimReward: (actor: backendInterface, rewardId: bigint) =>
    actor.claimReward(rewardId),
  getReferralStats: (actor: backendInterface) => actor.getReferralStats(),
  buyPremium: (actor: backendInterface) => actor.buyPremium(),
};
