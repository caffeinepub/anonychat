import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface RandomMessage {
    id: bigint;
    content: string;
    senderAnonId: string;
    timestamp: bigint;
    sessionId: bigint;
}
export interface RandomVoiceMessage {
    id: bigint;
    sessionId: bigint;
    senderAnonId: string;
    audioHash: string;
    duration: bigint;
    timestamp: bigint;
}
export interface RandomSession {
    id: bigint;
    startedAt: bigint;
    isActive: boolean;
    user1AnonId: string;
    user2AnonId: string;
}
export interface User {
    id: bigint;
    username?: string;
    createdAt: bigint;
    isOnline: boolean;
    anonymousId: string;
}
export interface VoiceMessage {
    id: bigint;
    duration: bigint;
    audioHash: string;
    receiverId: string;
    timestamp: bigint;
    senderId: string;
}
export interface Message {
    id: bigint;
    content: string;
    isGhost: boolean;
    receiverId: string;
    timestamp: bigint;
    ghostDeleteAt?: bigint;
    senderId: string;
}
export type MatchStatus = {
    __kind__: "Matched";
    Matched: {
        partnerAnonId: string;
        sessionId: bigint;
    };
} | {
    __kind__: "Waiting";
    Waiting: {
        joinedAt: bigint;
    };
} | {
    __kind__: "NotInQueue";
    NotInQueue: null;
} | {
    __kind__: "TimedOut";
    TimedOut: null;
};
export interface UserProfile {
    username?: string;
    isOnline: boolean;
    anonymousId: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}

// P2P Trading Types
export type ListingStatus = {
    __kind__: "Active";
    Active: null;
} | {
    __kind__: "Locked";
    Locked: null;
} | {
    __kind__: "Sold";
    Sold: null;
} | {
    __kind__: "Cancelled";
    Cancelled: null;
};

export type TradeStatus = {
    __kind__: "Pending";
    Pending: null;
} | {
    __kind__: "PaymentSent";
    PaymentSent: null;
} | {
    __kind__: "Confirmed";
    Confirmed: null;
} | {
    __kind__: "Rejected";
    Rejected: null;
} | {
    __kind__: "Disputed";
    Disputed: null;
} | {
    __kind__: "Cancelled";
    Cancelled: null;
};

export interface P2PListing {
    id: bigint;
    sellerPrincipal: Principal;
    sellerAnonId: string;
    listedAnonId: string;
    price: string;
    iban: string;
    status: ListingStatus;
    createdAt: bigint;
}

export interface P2PTrade {
    id: bigint;
    listingId: bigint;
    buyerPrincipal: Principal;
    buyerAnonId: string;
    sellerPrincipal: Principal;
    sellerAnonId: string;
    listedAnonId: string;
    price: string;
    iban: string;
    status: TradeStatus;
    proofScreenshotHash?: string;
    referenceNumber?: string;
    createdAt: bigint;
    paymentSentAt?: bigint;
}

// AnonCash Referral Types
export type RewardLevel =
    | { Level1: null }
    | { Level2: null }
    | { Level3: null };

export type RewardStatus =
    | { Pending: null }
    | { Claimable: null }
    | { Claimed: null };

export interface PendingReward {
    id: bigint;
    level: RewardLevel;
    amount: bigint;
    referredUserAnonId: string;
    createdAt: bigint;
    claimableAt: bigint;
    status: RewardStatus;
}

export interface ReferralStats {
    referralCode: [] | [string];
    totalReferrals: bigint;
    qualifiedReferrals: bigint;
    anonCashBalance: bigint;
    pendingAmount: bigint;
    level1Count: bigint;
    level2Unlocked: boolean;
    level3Count: bigint;
}


// Trade Review & Chat Types
export interface TradeReview {
    id: bigint;
    tradeId: bigint;
    reviewerPrincipal: Principal;
    targetPrincipal: Principal;
    targetAnonId: string;
    stars: bigint;
    comment: string;
    createdAt: bigint;
}

export interface TradeMessage {
    id: bigint;
    tradeId: bigint;
    senderPrincipal: Principal;
    senderAnonId: string;
    content: string;
    createdAt: bigint;
}

export interface SellerStats {
    averageRating: bigint;
    totalReviews: bigint;
    completedTrades: bigint;
}

export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(anonId: string): Promise<void>;
    checkMatchStatus(): Promise<MatchStatus>;
    deleteMessage(msgId: bigint): Promise<void>;
    endRandomSession(sessionId: bigint): Promise<void>;
    findUserByAnonId(anonId: string): Promise<UserProfile | null>;
    getBlockedUsers(): Promise<Array<string>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getConversation(otherAnonId: string): Promise<Array<Message>>;
    getCurrentSession(): Promise<RandomSession | null>;
    getMe(): Promise<User | null>;
    getRandomMessages(sessionId: bigint): Promise<Array<RandomMessage>>;
    getRandomVoiceMessages(sessionId: bigint): Promise<Array<RandomVoiceMessage>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVoiceMessages(otherAnonId: string): Promise<Array<VoiceMessage>>;
    isCallerAdmin(): Promise<boolean>;
    joinMatchQueue(): Promise<MatchStatus>;
    leaveMatchQueue(): Promise<void>;
    listUsers(): Promise<Array<User>>;
    register(): Promise<User>;
    reportUser(anonId: string, reason: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessage(receiverAnonId: string, content: string, isGhost: boolean): Promise<bigint>;
    sendRandomMessage(sessionId: bigint, content: string): Promise<bigint>;
    sendRandomVoiceMessage(sessionId: bigint, audioHash: string, duration: bigint): Promise<bigint>;
    sendVoiceMessage(receiverAnonId: string, audioHash: string, duration: bigint): Promise<bigint>;
    setOnline(isOnline: boolean): Promise<void>;
    unblockUser(anonId: string): Promise<void>;
    updateUsername(username: string): Promise<void>;
    // P2P Trading
    createListing(price: string, iban: string): Promise<P2PListing>;
    getActiveListings(): Promise<Array<P2PListing>>;
    getMyListings(): Promise<Array<P2PListing>>;
    cancelListing(listingId: bigint): Promise<void>;
    buyListing(listingId: bigint): Promise<P2PTrade>;
    markPaymentSent(tradeId: bigint, referenceNumber: string, screenshotHash: string): Promise<void>;
    confirmTrade(tradeId: bigint): Promise<void>;
    rejectTrade(tradeId: bigint): Promise<void>;
    getMyTrades(): Promise<Array<P2PTrade>>;
    getTrade(tradeId: bigint): Promise<P2PTrade | null>;
    cancelExpiredTrades(): Promise<bigint>;
    cancelTrade(tradeId: bigint): Promise<void>;
    // AnonCash Referral
    generateReferralCode(): Promise<string>;
    getReferralCode(): Promise<string | null>;
    useReferralCode(code: string): Promise<void>;
    getAnonCashBalance(): Promise<bigint>;
    getPendingRewards(): Promise<Array<PendingReward>>;
    claimReward(rewardId: bigint): Promise<bigint>;
    getReferralStats(): Promise<ReferralStats>;
    buyPremium(): Promise<void>;
    // Trade Reviews
    submitTradeReview(tradeId: bigint, stars: bigint, comment: string): Promise<TradeReview>;
    getSellerReviews(sellerAnonId: string): Promise<Array<TradeReview>>;
    getSellerStats(sellerAnonId: string): Promise<SellerStats>;
    // Trade Chat
    sendTradeMessage(tradeId: bigint, content: string): Promise<TradeMessage>;
    getTradeMessages(tradeId: bigint): Promise<Array<TradeMessage>>;
}
