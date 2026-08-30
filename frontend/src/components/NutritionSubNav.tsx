import { NavLink } from "react-router-dom";

export function NutritionSubNav() {
  return (
    <div className="workout-subnav">
      <NavLink
        to="/nutrition"
        end
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        Food
      </NavLink>
      <NavLink
        to="/nutrition/water"
        className={({ isActive }) => (isActive ? "active" : "")}
      >
        Water
      </NavLink>
    </div>
  );
}