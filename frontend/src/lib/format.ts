const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2024-05-10" -> "May 2024"
export function monthYear(d: unknown): string {
  const s = typeof d === "string" ? d : "";
  if (s.length < 7) return "";
  const m = MONTHS[Number(s.slice(5, 7)) - 1];
  return m ? `${m} ${s.slice(0, 4)}` : s.slice(0, 4);
}

export function yearOf(d: unknown): string {
  return typeof d === "string" && d.length >= 4 ? d.slice(0, 4) : "";
}

// "2019–2023", "2023" (same year), or "2019–" (ongoing)
export function yearRange(start: unknown, end: unknown, current?: unknown): string {
  const s = yearOf(start);
  const e = current ? "" : yearOf(end);
  if (s && e) return s === e ? s : `${s}–${e}`;
  if (s) return `${s}–`;
  return e;
}

export function download(content: Blob | string, filename: string) {
  const blob = typeof content === "string" ? new Blob([content], { type: "text/plain" }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
