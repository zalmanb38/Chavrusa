export type SessionStatus = "proposed" | "confirmed" | "cancelled";

export interface StudySession {
  id: string;
  connect_request_id: string;
  proposed_by: string;
  scheduled_at: string;
  status: SessionStatus;
  note: string;
}
