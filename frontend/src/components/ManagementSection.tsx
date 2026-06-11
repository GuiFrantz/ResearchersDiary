"use client";

import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { TEXT } from "@/lib/constants";
import { download } from "@/lib/format";
import { useLoad } from "@/lib/hooks";
import { formatDeptReport, formatInstReport } from "@/lib/reports";
import type { Department, DepartmentReport, Institution, InstitutionReport, User } from "@/lib/types";
import DepartmentList from "./DepartmentList";
import { Banner, Button, Input, Loading, PageTitle, SectionHeading } from "./ui";

interface Props {
  user: User;
}

export default function ManagementSection({ user }: Props) {
  const { data, loading, reload } = useLoad(async () => ({
    institution: user.institution_id
      ? await api<Institution>("GET", `/api/institutions/${user.institution_id}`).catch(() => null)
      : null,
    departments: await api<Department[]>("GET", "/api/departments").catch(() => [] as Department[]),
  }), [user.institution_id]);
  const institution = data?.institution ?? null;
  const departments = data?.departments ?? [];

  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");
  const [instName, setInstName] = useState("");
  const [editingInst, setEditingInst] = useState(false);

  function notify(text: string, t: "success" | "error") {
    setMessage(text);
    setTone(t);
  }

  const isInstHead = user.role === "institution_head";
  const isDeptHead = user.role === "department_head";

  async function updateInst() {
    if (!institution || !instName.trim()) return;
    try {
      await api("PUT", `/api/institutions/${institution.id}`, { name: instName.trim() });
      setEditingInst(false);
      notify(TEXT.management.updated, "success");
      reload();
    } catch (err: unknown) {
      notify(errMsg(err), "error");
    }
  }

  async function generateReport() {
    try {
      if (isDeptHead && user.department_id) {
        const r = await api<DepartmentReport>("GET", `/api/reports/department/${user.department_id}`);
        download(formatDeptReport(r), TEXT.management.deptReportFile);
      } else if (isInstHead && user.institution_id) {
        const r = await api<InstitutionReport>("GET", `/api/reports/institution/${user.institution_id}`);
        download(formatInstReport(r), TEXT.management.instReportFile);
      }
    } catch (err: unknown) {
      notify(errMsg(err), "error");
    }
  }

  if (loading) return <Loading />;

  if (!user.institution_id) {
    return (
      <div>
        <PageTitle>{TEXT.management.title}</PageTitle>
        <p className="text-sm text-dust-600 mt-3">{TEXT.common.notAffiliated}</p>
      </div>
    );
  }

  const visibleDepts = departments.filter((d) => d.institution_id === user.institution_id);

  return (
    <div>
      <PageTitle>{TEXT.management.title}</PageTitle>
      {institution && (
        editingInst ? (
          <div className="flex gap-2 max-w-md mt-2">
            <Input
              value={instName}
              onChange={(e) => setInstName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && updateInst()}
            />
            <Button onClick={updateInst}>{TEXT.common.save}</Button>
            <Button variant="ghost" onClick={() => setEditingInst(false)}>{TEXT.common.cancel}</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-sm text-dust-600">{institution.name}</p>
            {isInstHead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setInstName(institution.name); setEditingInst(true); }}
              >
                {TEXT.common.edit}
              </Button>
            )}
          </div>
        )
      )}

      {message && <Banner tone={tone} className="mt-6">{message}</Banner>}

      <section className="mt-10">
        <SectionHeading className="mb-3">{TEXT.management.reports}</SectionHeading>
        <Button variant="outline" onClick={generateReport}>
          {isInstHead ? TEXT.management.instReport : TEXT.management.deptReport}
        </Button>
      </section>

      {isInstHead && institution && (
        <DepartmentList depts={visibleDepts} institutionId={institution.id} notify={notify} onChanged={reload} />
      )}
    </div>
  );
}
