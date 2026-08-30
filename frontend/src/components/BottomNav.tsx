// import { NavLink } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";

function NutritionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3v6a2 2 0 0 0 4 0V3M8 3v18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 3c-1.8 0-3 1.9-3 5s1.2 4.5 3 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 3v18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      {/* AI stars (sparkle) */}
      <path
        d="M20 2l0.4 1.2L21.7 3l-1.1 0.6 0.3 1.2L20 4.2l-1 0.6 0.3-1.2L18.3 3l1.3-0.8 0.4-1.2Z"
        fill="currentColor"
      />
      <path
        d="M22.5 0.5l0.25 0.7l0.75 0.4l-0.7 0.4 0.2 0.7l-0.6 0.3l-0.6 0.3 0.2-0.7l-0.6-0.4 0.75-0.4 0.25-0.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

// function NutritionIcon() {
//   return (
//     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       {/* Plate circle */}
//       <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="1.8" />
//       {/* Fork tines */}
//       <path
//         d="M8 7v4M10 7v6M14 7v6M16 7v4"
//         stroke="currentColor"
//         strokeWidth="1.8"
//         strokeLinecap="round"
//       />
//       {/* Fork handle */}
//       <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
//       {/* AI dot (sparkle) */}
//       <circle cx="17" cy="5" r="1.2" fill="currentColor" />
//     </svg>
//   );
// }

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

function ChallengesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Star shape */}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// function ChallengesIcon() {
//   return (
//     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <path
//         d="M4 20 L11 13 M20 4 L13 11"
//         stroke="currentColor"
//         strokeWidth="2"
//         strokeLinecap="round"
//       />
//       <path
//         d="M4 4 L9 4 L9 9 M20 20 L15 20 L15 15"
//         stroke="currentColor"
//         strokeWidth="1.8"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// }

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

function TrendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 17 9 12l4 3 7-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 7h4v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// function HistoryIcon() {
//   return (
//     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <path
//         d="M12 7v5l3 2"
//         stroke="currentColor"
//         strokeWidth="1.8"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//       <path
//         d="M3.5 12a8.5 8.5 0 1 0 2.6-6.12"
//         stroke="currentColor"
//         strokeWidth="1.8"
//         strokeLinecap="round"
//       />
//       <path
//         d="M3 4v4h4"
//         stroke="currentColor"
//         strokeWidth="1.8"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// }


// const TABS = [
//   { to: "/bests", label: "Bests", Icon: TrophyIcon, end: true },
//   { to: "/challenges", label: "Challenges", Icon: ChallengesIcon, end: true },
//   { to: "/", label: "Log", Icon: DumbbellIcon, end: true },
//   // { to: "/history", label: "History", Icon: HistoryIcon, end: true },
//   { to: "/metrics", label: "Metrics", Icon: TrendIcon, end: true },
//   { to: "/nutrition", label: "Nutrition", Icon: NutritionIcon, end: true },
// ] as const;

const TABS = [
  {
    to: "/bests",
    label: "Bests",
    Icon: TrophyIcon,
    isActive: (p: string) => p === "/bests"
  },
  {
    to: "/challenges",
    label: "Challenges",
    Icon: ChallengesIcon,
    isActive: (p: string) => p.startsWith("/challenges"),
  },
  {
    to: "/",
    label: "Log",
    Icon: DumbbellIcon,
    isActive: (p: string) => p === "/" || p.startsWith("/history"),
  },
  {
    to: "/metrics",
    label: "Metrics",
    Icon: TrendIcon,
    isActive: (p: string) => p === "/metrics"
  },
  {
    to: "/nutrition",
    label: "Nutrition",
    Icon: NutritionIcon,
    isActive: (p: string) => p === "/nutrition"
  }
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  // return (
  //   <nav className="bottom-nav" aria-label="Main">
  //     {TABS.map(({ to, label, Icon, end }) => (
  //       <NavLink
  //         key={to}
  //         to={to}
  //         end={end}
  //         className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
  //       >
  //         <Icon />
  //         <span>{label}</span>
  //       </NavLink>
  //     ))}
  //   </nav>
  // );
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ to, label, Icon, isActive }) => (
        <Link
          key={to}
          to={to}
          className={`bottom-nav-item ${isActive(pathname) ? "active" : ""}`}
        >
          <Icon />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}