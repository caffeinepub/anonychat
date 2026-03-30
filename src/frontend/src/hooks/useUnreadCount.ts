import { useQuery } from "@tanstack/react-query";
import { useActor } from "./useActor";
import type { Message } from "./useQueries";

export function useUnreadCount(myAnonId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<number>({
    queryKey: ["unreadCount", myAnonId],
    queryFn: async () => {
      if (!actor || !myAnonId) return 0;

      const contacts: string[] = JSON.parse(
        localStorage.getItem("anonychat_contacts") ?? "[]",
      );

      if (contacts.length === 0) return 0;

      const results = await Promise.all(
        contacts.map(async (contactId) => {
          const lastRead = Number(
            localStorage.getItem(`anonychat_read_${contactId}`) ?? "0",
          );
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const messages: Message[] = await (actor as any).getConversation(
              contactId,
            );
            return messages.filter(
              (m) =>
                m.receiverId === myAnonId &&
                Number(m.timestamp / 1_000_000n) > lastRead,
            ).length;
          } catch {
            return 0;
          }
        }),
      );

      return results.reduce((a, b) => a + b, 0);
    },
    enabled: !!actor && !isFetching && myAnonId.length > 0,
    refetchInterval: 5000,
  });
}
