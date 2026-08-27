import { NavLink } from "react-router-dom";

function TrophyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4h10v3a5 5 0 0 1-10 0V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 5H4v1a4 4 0 0 0 4 4M17 5h3v1a4 4 0 0 1-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12v3m0 0c-1.66 0-3 .9-3 2v1h6v-1c0-1.1-1.34-2-3-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DumbbellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 9v6M2.5 10.5v3M6.5 7v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 9v6M21.5 10.5v3M17.5 7v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M6.5 12h11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 12a8.5 8.5 0 1 0 2.6-6.12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M3 4v4h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TABS = [
  { to: "/bests", label: "Bests", Icon: TrophyIcon, end: true },
  { to: "/", label: "Log", Icon: DumbbellIcon, end: true },
  { to: "/history", label: "History", Icon: HistoryIcon, end: true },
] as const;

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}