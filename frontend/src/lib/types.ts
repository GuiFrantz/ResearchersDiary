export type Visibility = "private" | "institution";
export type UserRole = "researcher" | "department_head" | "institution_head";
export type ProjectStatus = "active" | "concluded" | "canceled";
export type ProposalStatus = "draft" | "submitted" | "approved" | "denied";
export type InvitationStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";

export const ROLE_LABELS: Record<UserRole, string> = {
  researcher: "Researcher",
  department_head: "Dept Head",
  institution_head: "Inst Head",
};

export const ROLE_LEVEL: Record<UserRole, number> = {
  researcher: 0,
  department_head: 1,
  institution_head: 2,
};

export const NOT_AFFILIATED_MSG = "You're not in an institution.";
export const GENERIC_FAIL_MSG = "Something went wrong";

export interface Invitation {
  id: string;
  recipient_id: string;
  inviter_id: string;
  institution_id: string;
  department_id: string | null;
  role: UserRole;
  status: InvitationStatus;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  institution_name: string | null;
  department_name: string | null;
  inviter_name: string | null;
  recipient_name: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  orcid_id: string | null;
  institution_id: string | null;
  department_id: string | null;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Institution {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  institution_id: string;
  name: string;
  code: string | null;
}

// Records
export interface Publication {
  id: string;
  user_id: string;
  title: string;
  type: string | null;
  publication_date: string | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  abstract: string | null;
  status: string | null;
  visibility: Visibility;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  agency: string | null;
  grant_number: string | null;
  role: string | null;
  status: string | null;
  visibility: Visibility;
  start_date: string | null;
  end_date: string | null;
  budget: string | null;
}

export interface Proposal {
  id: string;
  user_id: string;
  title: string;
  funding_body: string | null;
  reference: string | null;
  role: string | null;
  status: string | null;
  visibility: Visibility;
  submission_date: string | null;
  decision_date: string | null;
  project_id: string | null;
}

export interface Experience {
  id: string;
  user_id: string;
  category: string | null;
  organization: string | null;
  role_title: string | null;
  description: string | null;
  visibility: Visibility;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

export type AnyRecord = Publication | Project | Proposal | Experience;

// Exports
export interface ExportRequest {
  publication_ids: string[];
  project_ids: string[];
  proposal_ids: string[];
  experience_ids: string[];
}

export interface OrcidWork {
  title: string;
  type: string | null;
  publication_date: string | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  abstract: string | null;
}

export interface OrcidFunding {
  title: string;
  agency: string | null;
  grant_number: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface OrcidEmployment {
  organization: string;
  role_title: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

export interface OrcidPerson {
  name: string | null;
  biography: string | null;
  country: string | null;
  keywords: string[];
}

export interface OrcidPreviewResult {
  person: OrcidPerson | null;
  publications: OrcidWork[];
  projects: OrcidFunding[];
  experiences: OrcidEmployment[];
}

export interface OrcidImportResult {
  publications_imported: number;
  projects_imported: number;
  experiences_imported: number;
  skipped: number;
}

// Reports
export interface PublicationStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export interface ProjectStats {
  total: number;
  by_status: Record<string, number>;
}

export interface ProposalStats {
  total: number;
  by_status: Record<string, number>;
}

export interface ResearcherSummary {
  user_id: string;
  name: string | null;
  publication_count: number;
  project_count: number;
  proposal_count: number;
  experience_count: number;
}

export interface DepartmentReport {
  generated_at: string;
  department: { id: string; name: string; code: string | null };
  institution: { id: string; name: string };
  researcher_count: number;
  publications: PublicationStats;
  projects: ProjectStats;
  proposals: ProposalStats;
  researchers: ResearcherSummary[];
}

export interface DepartmentRollup {
  department_id: string;
  name: string;
  code: string | null;
  researcher_count: number;
  publications: PublicationStats;
  projects: ProjectStats;
  proposals: ProposalStats;
}

export interface InstitutionReport {
  generated_at: string;
  institution: { id: string; name: string };
  department_count: number;
  total_researchers: number;
  departments: DepartmentRollup[];
  institution_totals: {
    publications: PublicationStats;
    projects: ProjectStats;
    proposals: ProposalStats;
  };
}

