import { monthYear, yearRange } from "./format";
import type { AnyRecord, ExportRequest } from "./types";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "number" | "textarea" | "checkbox";
  opts?: string[];
  required?: boolean;
}

export interface EntityConfig {
  label: string;
  singular: string;
  endpoint: string;
  exportKey: keyof ExportRequest;
  icon: string;
  display: (r: AnyRecord) => { title: string; sub: string; date: string };
  fields: FieldDef[];
}

const VISIBILITY: FieldDef = {
  name: "visibility", label: "Visibility", type: "select",
  opts: ["private", "institution"], required: true,
};

export const ENTITIES: Record<string, EntityConfig> = {
  publications: {
    label: "Publications", singular: "Publication", endpoint: "/api/publications",
    exportKey: "publication_ids", icon: "publication",
    display: (r) => {
      const p = r as unknown as Record<string, unknown>;
      return {
        title: String(p.title || "—"),
        sub: [p.type, p.publisher].filter(Boolean).join(" · ") || "—",
        date: monthYear(p.publication_date),
      };
    },
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "type", label: "Type", type: "select", opts: ["Article", "Book", "Conference", "Chapter", "Thesis", "Other"] },
      { name: "publisher", label: "Publisher", type: "text" },
      { name: "doi", label: "DOI", type: "text" },
      { name: "url", label: "URL", type: "text" },
      { name: "abstract", label: "Abstract", type: "textarea" },
      { name: "publication_date", label: "Date", type: "date" },
      { name: "status", label: "Status", type: "text" },
      VISIBILITY,
    ],
  },
  projects: {
    label: "Projects", singular: "Project", endpoint: "/api/projects",
    exportKey: "project_ids", icon: "project",
    display: (r) => {
      const p = r as unknown as Record<string, unknown>;
      return {
        title: String(p.title || "—"),
        sub: [p.agency, p.role].filter(Boolean).join(" · ") || "—",
        date: yearRange(p.start_date, p.end_date),
      };
    },
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "agency", label: "Agency", type: "text" },
      { name: "grant_number", label: "Grant No.", type: "text" },
      { name: "role", label: "Role", type: "text" },
      { name: "status", label: "Status", type: "select", opts: ["active", "concluded", "canceled"] },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
      { name: "budget", label: "Budget", type: "number" },
      VISIBILITY,
    ],
  },
  proposals: {
    label: "Proposals", singular: "Proposal", endpoint: "/api/proposals",
    exportKey: "proposal_ids", icon: "proposal",
    display: (r) => {
      const p = r as unknown as Record<string, unknown>;
      return {
        title: String(p.title || "—"),
        sub: String(p.funding_body || "—"),
        date: monthYear(p.submission_date),
      };
    },
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "funding_body", label: "Funding Body", type: "text" },
      { name: "reference", label: "Reference", type: "text" },
      { name: "role", label: "Role", type: "text" },
      { name: "status", label: "Status", type: "select", opts: ["draft", "submitted", "approved", "denied"] },
      { name: "submission_date", label: "Submission Date", type: "date" },
      { name: "decision_date", label: "Decision Date", type: "date" },
      VISIBILITY,
    ],
  },
  experiences: {
    label: "Experiences", singular: "Experience", endpoint: "/api/experiences",
    exportKey: "experience_ids", icon: "experience",
    display: (r) => {
      const p = r as unknown as Record<string, unknown>;
      return {
        title: String(p.role_title || p.category || "—"),
        sub: [p.category, p.organization].filter(Boolean).join(" · ") || "—",
        date: yearRange(p.start_date, p.end_date, p.is_current),
      };
    },
    fields: [
      { name: "category", label: "Category", type: "select", opts: ["Teaching", "Supervision", "Mentoring", "Industry", "Research", "Other"] },
      { name: "organization", label: "Organization", type: "text" },
      { name: "role_title", label: "Role Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "start_date", label: "Start Date", type: "date" },
      { name: "end_date", label: "End Date", type: "date" },
      { name: "is_current", label: "Current Position", type: "checkbox" },
      VISIBILITY,
    ],
  },
};

export const ENTITY_ORDER = ["publications", "projects", "proposals", "experiences"];
