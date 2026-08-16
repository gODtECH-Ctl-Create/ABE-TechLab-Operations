export type LeadStatus =
  | "new"
  | "researching"
  | "qualified"
  | "outreach_ready"
  | "contacted"
  | "engaged"
  | "opportunity"
  | "won"
  | "lost"
  | "nurture";

export type OrganisationStatus = "prospect" | "active" | "client" | "inactive";

export type ActivityType =
  | "note"
  | "email"
  | "call"
  | "meeting"
  | "status_change"
  | "ai_recommendation";

export interface Organisation {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  description?: string;
  status: OrganisationStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  organisationId: string;
  fullName: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  organisationId: string;
  primaryContactId?: string;
  source: string;
  problemSummary?: string;
  serviceInterest?: string;
  status: LeadStatus;
  score?: number;
  scoreReasons?: string[];
  nextAction?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  organisationId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  type: ActivityType;
  subject: string;
  summary?: string;
  actorType: "user" | "system" | "aria";
  createdAt: string;
}
