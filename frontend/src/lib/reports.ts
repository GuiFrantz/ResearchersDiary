import type { DepartmentReport, InstitutionReport } from "@/lib/types";

export function formatDeptReport(r: DepartmentReport): string {
  let t = "";
  t += `DEPARTMENT REPORT\n${"=".repeat(50)}\n\n`;
  t += `Department:   ${r.department.name}${r.department.code ? ` (${r.department.code})` : ""}\n`;
  t += `Institution:  ${r.institution.name}\n`;
  t += `Researchers:  ${r.researcher_count}\n`;
  t += `Generated:    ${new Date(r.generated_at).toLocaleString()}\n\n`;
  t += `SUMMARY\n${"-".repeat(30)}\n`;
  t += `  Publications:  ${r.publications.total}\n`;
  t += `  Projects:      ${r.projects.total}\n`;
  t += `  Proposals:     ${r.proposals.total}\n\n`;
  if (Object.keys(r.publications.by_type).length > 0) {
    t += `Publications by Type\n`;
    Object.entries(r.publications.by_type).forEach(([k, v]) => { t += `  ${k}: ${v}\n`; });
    t += "\n";
  }
  if (Object.keys(r.publications.by_status).length > 0) {
    t += `Publications by Status\n`;
    Object.entries(r.publications.by_status).forEach(([k, v]) => { t += `  ${k}: ${v}\n`; });
    t += "\n";
  }
  if (Object.keys(r.projects.by_status).length > 0) {
    t += `Projects by Status\n`;
    Object.entries(r.projects.by_status).forEach(([k, v]) => { t += `  ${k}: ${v}\n`; });
    t += "\n";
  }
  if (Object.keys(r.proposals.by_status).length > 0) {
    t += `Proposals by Status\n`;
    Object.entries(r.proposals.by_status).forEach(([k, v]) => { t += `  ${k}: ${v}\n`; });
    t += "\n";
  }
  if (r.researchers.length > 0) {
    t += `PER-RESEARCHER BREAKDOWN\n${"-".repeat(30)}\n`;
    r.researchers.forEach((res) => {
      t += `  ${res.name || "—"}: ${res.publication_count} pubs, ${res.project_count} projs, ${res.proposal_count} props, ${res.experience_count} exps\n`;
    });
  }
  return t;
}

export function formatInstReport(r: InstitutionReport): string {
  let t = "";
  t += `INSTITUTION REPORT\n${"=".repeat(50)}\n\n`;
  t += `Institution:  ${r.institution.name}\n`;
  t += `Departments:  ${r.department_count}\n`;
  t += `Researchers:  ${r.total_researchers}\n`;
  t += `Generated:    ${new Date(r.generated_at).toLocaleString()}\n\n`;
  t += `INSTITUTION TOTALS\n${"-".repeat(30)}\n`;
  t += `  Publications:  ${r.institution_totals.publications.total}\n`;
  t += `  Projects:      ${r.institution_totals.projects.total}\n`;
  t += `  Proposals:     ${r.institution_totals.proposals.total}\n\n`;
  r.departments.forEach((dept) => {
    t += `DEPARTMENT: ${dept.name}${dept.code ? ` (${dept.code})` : ""}\n${"-".repeat(30)}\n`;
    t += `  Researchers:   ${dept.researcher_count}\n`;
    t += `  Publications:  ${dept.publications.total}\n`;
    t += `  Projects:      ${dept.projects.total}\n`;
    t += `  Proposals:     ${dept.proposals.total}\n\n`;
  });
  return t;
}
