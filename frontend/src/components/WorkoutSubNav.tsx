import { NavLink } from "react-router-dom";

export function WorkoutSubNav() {
  return (
    <div className="workout-subnav">
      <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
        Log
      </NavLink>
      <NavLink
        to="/history"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        History
      </NavLink>
    </div>
  );
}