"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  NOT_AFFILIATED_MSG,
  GENERIC_FAIL_MSG,
  type Institution,
  type Department,
  type User,
  type DepartmentReport,
  type InstitutionReport,
} from "@/lib/types";

interface Props {
  user: User;
}

function formatDeptReport(r: DepartmentReport): string {
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

function formatInstReport(r: InstitutionReport): string {
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

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ManagementSection({ user }: Props) {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  function notify(text: string, tone: "success" | "error") {
    setMessage(text);
    setMessageTone(tone);
  }

  const [instName, setInstName] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  const isInstHead = user.role === "institution_head";
  const isDeptHead = user.role === "department_head";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (user.institution_id) {
        const inst = await api<Institution>("GET", `/api/institutions/${user.institution_id}`);
        setInstitution(inst);
        setInstName(inst.name);
      }
      const depts = await api<Department[]>("GET", "/api/departments");
      setDepartments(depts);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [user.institution_id]);

  useEffect(() => { load(); }, [load]);

  async function updateInst() {
    if (!institution || !instName.trim()) return;
    setMessage("");
    try {
      await api("PUT", `/api/institutions/${institution.id}`, { name: instName.trim() });
      notify("Institution updated", "success");
      load();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : GENERIC_FAIL_MSG, "error");
    }
  }

  async function createDept() {
    if (!deptName.trim() || !user.institution_id) return;
    setMessage("");
    try {
      await api("POST", "/api/departments/", {
        institution_id: user.institution_id,
        name: deptName.trim(),
        code: deptCode.trim() || null,
      });
      setDeptName("");
      setDeptCode("");
      notify("Department created", "success");
      load();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : GENERIC_FAIL_MSG, "error");
    }
  }

  function startEdit(d: Department) {
    setEditingDeptId(d.id);
    setEditName(d.name);
    setEditCode(d.code ?? "");
  }

  async function saveEdit() {
    if (!editingDeptId || !editName.trim()) return;
    setMessage("");
    try {
      await api("PUT", `/api/departments/${editingDeptId}`, {
        name: editName.trim(),
        code: editCode.trim() || null,
      });
      setEditingDeptId(null);
      notify("Department updated", "success");
      load();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : GENERIC_FAIL_MSG, "error");
    }
  }

  async function generateReport() {
    setMessage("");
    try {
      if (isDeptHead && user.department_id) {
        const r = await api<DepartmentReport>("GET", `/api/reports/department/${user.department_id}`);
        downloadText(formatDeptReport(r), "department_report.txt");
      } else if (isInstHead && user.institution_id) {
        const r = await api<InstitutionReport>("GET", `/api/reports/institution/${user.institution_id}`);
        downloadText(formatInstReport(r), "institution_report.txt");
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : GENERIC_FAIL_MSG, "error");
    }
  }

  if (loading) return <p className="text-sm text-gray-400 py-4">Loading...</p>;

  if (!user.institution_id) {
    return (
      <div>
        <h2 className="text-lg font-semibold">Management</h2>
        <p className="text-sm text-gray-400 mt-3">{NOT_AFFILIATED_MSG}</p>
      </div>
    );
  }

  const visibleDepts = departments.filter((d) => d.institution_id === user.institution_id);
  const reportLabel = isInstHead ? "Generate Institution Report" : "Generate Department Report";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Management</h2>
        {institution && <p className="text-sm text-gray-400">{institution.name}</p>}
      </div>

      {message && (
        <div className={`text-sm px-3 py-2 rounded-lg ${messageTone === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {message}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Reports</h3>
        <button
          onClick={generateReport}
          className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm rounded-lg hover:bg-emerald-200 transition-colors"
        >
          {reportLabel}
        </button>
      </div>

      {isInstHead && institution && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Institution</h3>
            <div className="flex gap-2">
              <input
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={updateInst} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                Save
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Departments ({visibleDepts.length})</h3>
            <div className="space-y-1.5 mb-3">
              {visibleDepts.map((dept) => {
                const isEditing = editingDeptId === dept.id;
                return (
                  <div key={dept.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          placeholder="Code"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button onClick={saveEdit} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded">Save</button>
                        <button onClick={() => setEditingDeptId(null)} className="text-xs text-gray-400">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-sm text-gray-900">{dept.name}</span>
                          {dept.code && <span className="text-xs text-gray-400 ml-1">({dept.code})</span>}
                        </div>
                        <button onClick={() => startEdit(dept)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Name"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === "Enter" && createDept()}
              />
              <input
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
                placeholder="Code"
                className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={createDept} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                Create
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
