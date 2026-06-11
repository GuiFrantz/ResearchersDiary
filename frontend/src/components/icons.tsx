const PATHS: Record<string, string[]> = {
  // nav
  library: [
    "M2 4h7a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2z",
    "M22 4h-7a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22z",
  ],
  people: [
    "M9 3.5a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6",
    "M2 21v-1a6 6 0 0 1 12 0v1",
    "M16 4a3.8 3.8 0 0 1 0 7",
    "M22 21v-1a6 6 0 0 0-4-5.5",
  ],
  management: [
    "M4 21v-7", "M4 10V3", "M12 21v-9", "M12 8V3", "M20 21v-5", "M20 12V3",
    "M2 14h4", "M10 8h4", "M18 16h4",
  ],
  // record kinds
  publication: [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
    "M14 2v6h6", "M9 13h6", "M9 17h3",
  ],
  project: [
    "M10 2v7l-5.3 9.3a2 2 0 0 0 1.7 3.2h11.2a2 2 0 0 0 1.7-3.2L14 9V2",
    "M8.5 2h7", "M7.5 15h9",
  ],
  proposal: [
    "M12 20h9",
    "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  ],
  experience: [
    "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  ],
  // chrome
  inbox: [
    "M22 12h-6l-2 3h-4l-2-3H2",
    "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  ],
  plus: ["M12 5v14", "M5 12h14"],
  close: ["M18 6 6 18", "m6 6 12 12"],
};

export default function Icon({ name, size = 17 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block shrink-0"
      aria-hidden="true"
    >
      {(PATHS[name] ?? []).map((d, i) => (
        <path d={d} key={i} />
      ))}
    </svg>
  );
}
