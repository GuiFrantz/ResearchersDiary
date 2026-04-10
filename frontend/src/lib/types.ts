export type Visibility = "private" | "institution";
export type UserRole = "researcher" | "department_head" | "institution_head" | "admin";
export type ProjectStatus = "active" | "concluded" | "canceled";
export type ProposalStatus = "draft" | "submitted" | "approved" | "denied";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  position_title: string | null;
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
  status: string | null;
  visibility: Visibility;
  is_imported: boolean;
  created_at: string;
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

// Demo
export interface DemoCredential {
  email: string;
  name: string;
  role: UserRole;
  password: string;
  token: string;
  institution: string | null;
  department: string | null;
}

export interface DemoSeedResponse {
  seeded: boolean;
  already_existed?: boolean;
  credentials: DemoCredential[];
}
