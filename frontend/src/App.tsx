import { NavLink, Route, Routes } from "react-router-dom";
import { ExerciseSuggestions } from "./components/ExerciseSuggestions";
import { UserSwitch } from "./components/UserSwitch";
import { UserProvider } from "./context/UserContext";
import { History } from "./pages/History";
import { LogWorkout } from "./pages/LogWorkout";
import { PersonalBests } from "./pages/PersonalBests";
import "./App.css";

function AppShell() {
  return (
    <>
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true" />
          <h1>Fitness Coach</h1>
        </div>
        <UserSwitch />
      </header>

      <nav className="app-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Log workout
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>
          History
        </NavLink>
        <NavLink to="/bests" className={({ isActive }) => (isActive ? "active" : "")}>
          Personal bests
        </NavLink>
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<LogWorkout />} />
          <Route path="/history" element={<History />} />
          <Route path="/bests" element={<PersonalBests />} />
        </Routes>
      </main>

      <ExerciseSuggestions />
    </>
  );
}

function App() {
  return (
    <UserProvider>
      <AppShell />
    </UserProvider>
  );
}

export default App;
