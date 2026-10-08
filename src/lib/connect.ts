export type ConnectStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "matched"
  | "declined";

export interface ConnectRequestRow {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined" | "admin_resolved";
  updated_at: string;
}

export interface ConnectInfo {
  status: ConnectStatus;
  requestId: string | null;
  // When a "declined" status lifts, as an ISO string so it survives the
  // server/client boundary. Null for every other status.
  retryAfter: string | null;
}

// How long after a decline before the same person may ask again. Mirrors
// the interval in connect_request_cooldown_clear (migration 0025), which
// is what actually enforces it — this only decides when to offer the
// button again.
export const DECLINE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// When a pair has more than one row — a decline and a later request, or
// requests in both directions — the live relationship wins.
const PRECEDENCE: Record<ConnectStatus, number> = {
  matched: 4,
  pending_received: 3,
  pending_sent: 2,
  declined: 1,
  none: 0,
};

// Builds a lookup of "other user id" -> relationship status, from every
// connect_requests row (in either direction) involving `userId`.
export function buildConnectStatusMap(
  rows: ConnectRequestRow[],
  userId: string,
  now: number = Date.now(),
): Map<string, ConnectInfo> {
  const map = new Map<string, ConnectInfo>();

  for (const row of rows) {
    const otherId = row.requester_id === userId ? row.recipient_id : row.requester_id;

    let status: ConnectStatus;
    let retryAfter: string | null = null;
    if (row.status === "accepted") {
      status = "matched";
    } else if (row.status === "declined") {
      // Only the person who was declined waits out the cooldown. The
      // person who declined is free to ask the other way whenever they
      // change their mind.
      const liftsAt = new Date(row.updated_at).getTime() + DECLINE_COOLDOWN_MS;
      const coolingDown = row.requester_id === userId && now < liftsAt;
      status = coolingDown ? "declined" : "none";
      if (coolingDown) {
        retryAfter = new Date(liftsAt).toISOString();
      }
    } else if (row.requester_id === userId) {
      status = "pending_sent";
    } else {
      status = "pending_received";
    }

    const existing = map.get(otherId);
    if (!existing || PRECEDENCE[status] > PRECEDENCE[existing.status]) {
      map.set(otherId, {
        status,
        requestId: status === "none" ? null : row.id,
        retryAfter,
      });
    }
  }

  return map;
}
