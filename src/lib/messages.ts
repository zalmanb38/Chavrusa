export const MAX_MESSAGE_LENGTH = 2000;

export interface Message {
  id: string;
  connect_request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export const MESSAGE_COLUMNS =
  "id, connect_request_id, sender_id, body, created_at, read_at";

/**
 * Unread means: sent by the other person, and not yet marked read. Your
 * own messages are never unread to you, which is easy to get wrong in a
 * count query and produces a badge that never clears.
 */
export function unreadCount(messages: Message[], viewerId: string): number {
  return messages.filter((m) => m.sender_id !== viewerId && m.read_at === null)
    .length;
}
