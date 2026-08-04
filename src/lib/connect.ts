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
  status: "pending" | "accepted" | "declined";
}

export interface ConnectInfo {
  status: ConnectStatus;
  requestId: string | null;
}

// Builds a lookup of "other user id" -> relationship status, from every
// connect_requests row (in either direction) involving `userId`.
export function buildConnectStatusMap(
  rows: ConnectRequestRow[],
  userId: string,
): Map<string, ConnectInfo> {
  const map = new Map<string, ConnectInfo>();

  for (const row of rows) {
    const otherId = row.requester_id === userId ? row.recipient_id : row.requester_id;

    let status: ConnectStatus;
    if (row.status === "accepted") {
      status = "matched";
    } else if (row.status === "declined") {
      status = "declined";
    } else if (row.requester_id === userId) {
      status = "pending_sent";
    } else {
      status = "pending_received";
    }

    map.set(otherId, { status, requestId: row.id });
  }

  return map;
}
