import type { Invitation, NavItem, OrcidImportResult, User, UserRole } from "./types";

// Roles
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

export const ALL_ROLES: UserRole[] = ["researcher", "department_head", "institution_head"];

// Pill tone classes
export const STATUS_TONES: Record<string, string> = {
  active: "bg-leaf-100 text-leaf-700",
  approved: "bg-leaf-100 text-leaf-700",
  submitted: "bg-olive-100 text-olive-700",
  concluded: "bg-dust-200 text-dust-700",
  draft: "bg-dust-200 text-dust-700",
  canceled: "bg-clay-100 text-clay",
  denied: "bg-clay-100 text-clay",
};

export const ROLE_TONES: Record<UserRole, string> = {
  researcher: "bg-dust-200 text-dust-700",
  department_head: "bg-olive-100 text-olive-700",
  institution_head: "bg-leaf-100 text-leaf-700",
};

// Navigation
export const NAV_ITEMS: NavItem[] = [
  { id: "library", label: "Library", icon: "library" },
  { id: "people", label: "People", icon: "people" },
  { id: "management", label: "Management", icon: "management", minRole: "department_head" },
];

// User-facing text
export const TEXT = {
  common: {
    appName: "Researcher's Diary",
    appDescription: "Manage your academic career",
    loading: "Loading...",
    genericFail: "Something went wrong",
    notAffiliated: "You're not in an institution.",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    close: "Close",
    edit: "Edit",
    done: "Done",
    create: "Create",
    delete: "Delete",
  },
  login: {
    signIn: "Sign In",
    register: "Register",
    name: "Name",
    namePlaceholder: "Your name (optional)",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordHintRegister: "At least 8 characters",
    passwordHintLogin: "Enter your password",
    createAccount: "Create Account",
    creatingAccount: "Creating account...",
    signingIn: "Signing in...",
  },
  library: {
    title: "Library",
    newRecord: "New record",
    empty: "No records yet.",
    export: (n: number) => `Export ${n}`,
    exportFilename: () => `personal_export_${new Date().toISOString().slice(0, 10)}.json`,
    yourRecords: (n: number) => `Your records · ${n}`,
    institutionRecords: (n: number) => `From your institution · ${n}`,
  },
  records: {
    editTitle: (entity: string) => `Edit ${entity}`,
    newTitle: (entity: string) => `New ${entity}`,
    confirmDelete: (entity: string) => `Delete this ${entity}?`,
  },
  people: {
    title: "People",
    noInstitution: "Create an institution or wait for an invitation.",
    pendingSent: "Pending invitations sent",
    sendInvitation: "Send invitation",
    you: "you",
    remove: "Remove",
    noDept: "No dept",
    leave: "Leave institution",
    unaffiliated: "Unaffiliated",
    unknownInstitution: "Unknown Institution",
    confirmRoleChange(target: User, newRole: UserRole): string {
      const name = target.name || target.email;
      return `Change ${name}'s role from ${ROLE_LABELS[target.role]} to ${ROLE_LABELS[newRole]}?`;
    },
    confirmRemove: (name: string) =>
      [
        `Remove ${name} from this institution?`,
        "",
        "They will be removed from any department.",
      ].join("\n"),
    confirmLeave: [
      "Leave this institution?",
      "",
      "If you're the last member, the institution and its departments will be deleted."
    ].join("\n"),
  },
  management: {
    title: "Management",
    updated: "Institution updated",
    reports: "Reports",
    deptReport: "Generate department report",
    instReport: "Generate institution report",
    deptReportFile: "department_report.txt",
    instReportFile: "institution_report.txt",
    reportGenerated: "Report generated",
    departments: (n: number) => `Departments · ${n}`,
    createDept: "Create new department",
    deptCreated: "Department created",
    deptUpdated: "Department updated",
    newDeptPlaceholder: "New department",
    codePlaceholder: "Code",
  },
  profile: {
    title: "Profile",
    name: "Name",
    email: "Email",
    role: "Role",
    institution: "Institution",
    department: "Department",
    orcid: "ORCID iD",
    orcidPlaceholder: "0000-0000-0000-0000",
    orcidHint: "Import your existing data from ORCID.",
    orcidInvalid: "Invalid ORCID iD format",
    orcidMissing: "Enter your ORCID iD",
    import: "Import",
    importing: "Searching...",
    saved: "Saved.",
    logout: "Log out",
  },
  orcid: {
    title: "Import from ORCID",
    isThisYou: "Is this you? Review the records below before importing.",
    noRecords: "No records found on this ORCID profile.",
    found: (n: number) =>
      `Found ${n} record${n === 1 ? "" : "s"}. Any already in your library are skipped automatically.`,
    publications: "Publications",
    projects: "Projects",
    experiences: "Experiences",
    doi: (v: string) => `DOI: ${v}`,
    grant: (v: string) => `Grant: ${v}`,
    back: "Back",
    done: "Done",
    importing: "Importing...",
    importN: (n: number) => `Import ${n}`,
    result: (r: OrcidImportResult) =>
      `Imported ${r.publications_imported} publications, ${r.projects_imported} projects, ` +
      `${r.experiences_imported} experiences · skipped ${r.skipped} duplicates.`,
  },
  inbox: {
    title: "Invitations",
    empty: "No invitations.",
    accept: "Accept",
    decline: "Decline",
    institutionLine: (inv: Invitation) =>
      `${inv.institution_name ?? "Institution"}${inv.department_name ? ` · ${inv.department_name}` : ""}`,
    fromLine: (inv: Invitation) =>
      `${ROLE_LABELS[inv.role]} · from ${inv.inviter_name ?? "someone"}`,
    confirmAccept: (inv: Invitation) =>
      [
        `Accept this invitation to ${inv.institution_name ?? "the institution"}` +
        (inv.department_name ? ` (${inv.department_name})` : "") + "?",
        "",
        `Your role will be set to ${ROLE_LABELS[inv.role]}.`,
        "  • If you're already in another institution, you'll leave it.",
      ].join("\n"),
  },
  sent: {
    empty: "No pending invitations.",
    unknownUser: "(user)",
    sentOn: (iso: string) => `sent ${new Date(iso).toLocaleDateString()}`,
  },
  invite: {
    emailPlaceholder: "Recipient email...",
    find: "Find",
    finding: "Looking...",
    change: "change",
    send: "Send",
    sending: "Sending...",
    deptRequired: "Department (required)...",
    noDept: "No department",
    lookupFirst: "Look up a recipient first.",
    pickDept: "Pick a department for the invitation.",
    selfInvite: "You can't invite yourself.",
    notInYourInstitution: "This user is not in your institution.",
    isInstHead: "You can't invite the institution head.",
    alreadyInDept: "This user is already in your department.",
    alreadyInInstitution: "This user is already in your institution.",
    crossInstitution:
      "This user is currently in another institution. If they accept, they'll leave it. ",
    confirmSendAnyway: (notice: string) => `${notice}\n\nSend invitation anyway?`,
  },
  institution: {
    placeholder: "Institution name",
    creating: "Creating...",
  },
};
