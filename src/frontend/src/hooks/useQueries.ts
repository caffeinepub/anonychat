import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User, UserProfile } from "../backend";
import type { RandomVoiceMessage } from "../backend.d";
import { useActor } from "./useActor";

// Message type - will be part of backend.ts once regenerated
export interface Message {
  id: bigint;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: bigint;
  isGhost: boolean;
  ghostDeleteAt: bigint | null;
}

export interface PublicUserProfile {
  anonymousId: string;
  username: string | null;
  isOnline: boolean;
  lat: number | null;
  lon: number | null;
}

export function useGetMe() {
  const { actor, isFetching } = useActor();
  return useQuery<User | null>({
    queryKey: ["me"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMe();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listUsers();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useListPublicUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<PublicUserProfile[]>({
    queryKey: ["publicUsers"],
    queryFn: async () => {
      if (!actor) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).listPublicUsers();
      return result.map((u: any) => ({
        anonymousId: u.anonymousId,
        username: u.username ?? null,
        isOnline: u.isOnline,
        lat: u.lat != null && u.lat.length > 0 ? Number(u.lat[0]) : null,
        lon: u.lon != null && u.lon.length > 0 ? Number(u.lon[0]) : null,
      }));
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

export function useRegister() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.register();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUsername() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      if (!actor) throw new Error("No actor");
      await actor.updateUsername(username);
      return username;
    },
    onSuccess: (username) => {
      queryClient.setQueryData(["me"], (old: User | null) => {
        if (!old) return old;
        return { ...old, username };
      });
    },
  });
}

export function useSetOnline() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (isOnline: boolean) => {
      if (!actor) throw new Error("No actor");
      await actor.setOnline(isOnline);
      return isOnline;
    },
    onSuccess: (isOnline) => {
      queryClient.setQueryData(["me"], (old: User | null) => {
        if (!old) return old;
        return { ...old, isOnline };
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lat, lon }: { lat: number; lon: number }) => {
      if (!actor) throw new Error("No actor");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (actor as any).updateLocation(lat, lon);
      return { lat, lon };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicUsers"] });
    },
  });
}

export function useFindUser(anonId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["findUser", anonId],
    queryFn: async () => {
      if (!actor || !anonId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).findUserByAnonId(anonId);
    },
    enabled: !!actor && !isFetching && anonId.length > 0,
    retry: false,
  });
}

export function useGetConversation(otherAnonId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Message[]>({
    queryKey: ["conversation", otherAnonId],
    queryFn: async () => {
      if (!actor || !otherAnonId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).getConversation(otherAnonId);
    },
    enabled: !!actor && !isFetching && otherAnonId.length > 0,
    refetchInterval: 2000,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      receiverAnonId,
      content,
      isGhost,
    }: {
      receiverAnonId: string;
      content: string;
      isGhost: boolean;
    }) => {
      if (!actor) throw new Error("No actor");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).sendMessage(receiverAnonId, content, isGhost);
    },
    onSuccess: (_, { receiverAnonId }) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", receiverAnonId],
      });
    },
  });
}

export function useDeleteMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      msgId,
      otherAnonId,
    }: {
      msgId: bigint;
      otherAnonId: string;
    }) => {
      if (!actor) throw new Error("No actor");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (actor as any).deleteMessage(msgId);
      return otherAnonId;
    },
    onSuccess: (otherAnonId) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation", otherAnonId],
      });
    },
  });
}

export function useBlockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (anonId: string) => {
      if (!actor) throw new Error("No actor");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (actor as any).blockUser(anonId);
      return anonId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
    },
  });
}

export function useUnblockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (anonId: string) => {
      if (!actor) throw new Error("No actor");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (actor as any).unblockUser(anonId);
      return anonId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
    },
  });
}

export function useGetBlockedUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["blockedUsers"],
    queryFn: async () => {
      if (!actor) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).getBlockedUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useReportUser() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      anonId,
      reason,
    }: {
      anonId: string;
      reason: string;
    }) => {
      if (!actor) throw new Error("No actor");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (actor as any).reportUser(anonId, reason);
    },
  });
}

export function useGetVoiceMessages(otherAnonId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<import("../backend.d").VoiceMessage[]>({
    queryKey: ["voiceMessages", otherAnonId],
    queryFn: async () => {
      if (!actor || !otherAnonId) return [];
      return (actor as any).getVoiceMessages(otherAnonId);
    },
    enabled: !!actor && !isFetching && otherAnonId.length > 0,
    refetchInterval: 2000,
  });
}

export function useSendVoiceMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      receiverAnonId,
      audioHash,
      duration,
    }: {
      receiverAnonId: string;
      audioHash: string;
      duration: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).sendVoiceMessage(
        receiverAnonId,
        audioHash,
        duration,
      );
    },
    onSuccess: (_, { receiverAnonId }) => {
      queryClient.invalidateQueries({
        queryKey: ["voiceMessages", receiverAnonId],
      });
    },
  });
}

export function useSendRandomVoiceMessage() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      sessionId,
      audioHash,
      duration,
    }: {
      sessionId: bigint;
      audioHash: string;
      duration: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).sendRandomVoiceMessage(
        sessionId,
        audioHash,
        duration,
      );
    },
  });
}

export function useGetRandomVoiceMessages(sessionId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<RandomVoiceMessage[]>({
    queryKey: ["randomVoiceMessages", sessionId?.toString()],
    queryFn: async () => {
      if (!actor || sessionId === null) return [];
      return (actor as any).getRandomVoiceMessages(sessionId);
    },
    enabled: !!actor && !isFetching && sessionId !== null,
    refetchInterval: 2000,
  });
}
