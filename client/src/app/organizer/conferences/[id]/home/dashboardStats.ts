export interface OrganizerConferenceDashboardStatsResponse {
  participants: {
    total: number;
    registered: number;
    waitlisted: number;
    byRole: Record<string, number>;
  };
  program: {
    daysCount: number;
    sessionsCount: number;
    presentationsCount: number;
    unscheduledAccepted: number;
  };
  submissions: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    underReview: number;
  };
}

export interface DashboardStats {
  submissions: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    underReview: number;
  };
  participants: {
    total: number;
    registered: number;
    waitlisted: number;
    byRole: Record<string, number>;
  };
  program: {
    days: number;
    sessions: number;
    presentations: number;
    unscheduled: number;
  };
}
