/**
 * Phase 6: Participant Audit Logging
 * 
 * Minimal audit infrastructure for logging participant-related actions.
 * Hooks for future integration with AdminAuditLog.
 */

export interface ParticipantAuditLog {
  entityType: "ConferenceParticipant";
  action:
    | "APPROVE_FROM_WAITLIST"
    | "CANCEL_REGISTRATION"
    | "REINSTATE_REGISTRATION"
    | "MARK_WITHDRAWN"
    | "REMOVE_FROM_ACTIVE_LIST";
  actorId: number;
  actorEmail: string;
  targetUserId: number;
  conferenceId: number;
  reason?: string;
  notes?: string;
  isImpersonation?: boolean;
  realAdminId?: number;
  realAdminEmail?: string;
  timestamp: Date;
}

/**
 * Log a participant action. Currently logs to console.
 * In future, integrate with AdminAuditLog model.
 */
export function logParticipantAction(log: ParticipantAuditLog): void {
  console.log(
    `[AUDIT] ${log.action} | Actor: ${log.actorEmail} (${log.actorId}) | Target: ${log.targetUserId} | Conference: ${log.conferenceId}` +
    (log.reason ? ` | Reason: ${log.reason}` : "") +
    (log.notes ? ` | Notes: ${log.notes}` : "") +
    (log.isImpersonation ? ` | IMPERSONATION by ${log.realAdminEmail}` : "")
  );
  // TODO: persist to AdminAuditLog table when needed
}

/**
 * Check if a request is from an impersonating admin.
 * TODO: integrate with actual impersonation middleware/headers
 */
export function getImpersonationInfo(req: unknown): {
  realAdminId?: number;
  realAdminEmail?: string;
  isImpersonation: boolean;
} {
  // Placeholder: real implementation would check for special headers or session markers
  return {
    isImpersonation: false,
  };
}
