// Central type registry — all shared types live here.
// Components import from '@/types' instead of individual files.
export type {
  User,
  Message as BackendMessage,
  VoiceMessage,
  UserProfile,
  MatchStatus,
  RandomMessage,
  RandomVoiceMessage,
  RandomSession,
  P2PListing,
  P2PTrade,
  ListingStatus,
  TradeStatus,
  PendingReward,
  ReferralStats,
  RewardLevel,
  RewardStatus,
  backendInterface,
} from "../backend.d";

// Re-export the extended Message type from useQueries (has ghostDeleteAt as null-friendly)
export type { Message, PublicUserProfile } from "../hooks/useQueries";
