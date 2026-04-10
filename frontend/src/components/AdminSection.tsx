"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Institution, Department, User } from "@/lib/types";

export default function AdminSection() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Create forms
  const [instName, setInstName] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptInstId, setDeptInstId] = useState("");

  // Assign user to institution
  const [assignUserId, setAssignUserId] = useState("");
  const [assignInstId, setAssignInstId] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [i, d, u] = await Promise.all([
        api<Institution[]>("GET", "/api/institutions"),
        api<Department[]>("GET", "/api/departments"),
        api<User[]>("GET", "/api/users"),
      ]);
      setInstitutions(i);
      setDepartments(d);
      setUsers(u);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function createInst() {
    if (!instName.trim()) return;
    setMessage("");
    try {
      await api("POST", "/api/institutions", { name: instName.trim() });
      setInstName("");
      setMessage("Institution created");
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  async function deleteInst(id: string) {
    if (!confirm("Delete this institution?")) return;
    setMessage("");
    try {
      await api("DELETE", `/api/institutions/${id}`);
      setMessage("Institution deleted");
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed — institution may still have users");
    }
  }

  async function createDept() {
    if (!deptName.trim() || !deptInstId) return;
    setMessage("");
    try {
      await api("POST", "/api/departments", {
        institution_id: deptInstId,
        name: deptName.trim(),
        code: deptCode.trim() || null,
      });
      setDeptName("");
      setDeptCode("");
      setMessage("Department created");
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  async function deleteDept(id: string) {
    if (!confirm("Delete this department?")) return;
    setMessage("");
    try {
      await api("DELETE", `/api/departments/${id}`);
      setMessage("Department deleted");
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed — department may still have users");
    }
  }

  async function assignToInst() {
    if (!assignUserId || !assignInstId) return;
    setMessage("");
    try {
      await api("PUT", `/api/users/${assignUserId}/institution`, { institution_id: assignInstId });
      setMessage("User assigned to institution");
      setAssignUserId("");
      load();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) return <p className="text-sm text-gray-400 py-4">Loading...</p>;

  const unaffiliatedUsers = users.filter((u) => !u.institution_id);

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">Admin Panel</h2>

      {message && (
        <div className={`text-sm px-3 py-2 rounded-lg ${message.includes("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {message}
        </div>
      )}

      {/* Institutions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Institutions ({institutions.length})</h3>
        <div className="space-y-1.5 mb-3">
          {institutions.map((inst) => (
            <div key={inst.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg">
              <span className="text-sm text-gray-900">{inst.name}</span>
              <button onClick={() => deleteInst(inst.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={instName}
            onChange={(e) => setInstName(e.target.value)}
            placeholder="Institution name"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === "Enter" && createInst()}
          />
          <button onClick={createInst} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
            Create
          </button>
        </div>
      </div>

      {/* Departments */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Departments ({departments.length})</h3>
        <div className="space-y-1.5 mb-3">
          {departments.map((dept) => {
            const inst = institutions.find((i) => i.id === dept.institution_id);
            return (
              <div key={dept.id} className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg">
                <div>
                  <span className="text-sm text-gray-900">{dept.name}</span>
                  {dept.code && <span className="text-xs text-gray-400 ml-1">({dept.code})</span>}
                  {inst && <span className="text-xs text-gray-400 ml-2">&middot; {inst.name}</span>}
                </div>
                <button onClick={() => deleteDept(dept.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <select
            value={deptInstId}
            onChange={(e) => setDeptInstId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Institution...</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <input
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            placeholder="Name"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      {/* Assign to institution */}
      {unaffiliatedUsers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Assign User to Institution</h3>
          <div className="flex gap-2">
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select user...</option>
              {unaffiliatedUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
            <select
              value={assignInstId}
              onChange={(e) => setAssignInstId(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select institution...</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <button onClick={assignToInst} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              Assign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
