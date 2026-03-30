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
}
