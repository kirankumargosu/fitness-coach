import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Avatar } from "./components/Avatar";
import { BottomNav } from "./components/BottomNav";
import { ExerciseSuggestions } from "./components/ExerciseSuggestions";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";
import { History } from "./pages/History";
import { Login } from "./pages/Login";
import { LogWorkout } from "./pages/LogWorkout";
import { PersonalBests } from "./pages/PersonalBests";
import { ProfilePage } from "./pages/ProfilePage";
import { Register } from "./pages/Register";
import { UserProfile } from "./pages/UserProfile";
import { Users } from "./pages/Users";
import { Metrics } from "./pages/Metrics";
import { Challenges } from "./pages/Challanges";
import { ChallengeDetail } from "./pages/ChallangeDetail";
import { Nutrition } from "./pages/Nutrition";
import { WaterIntake } from "./pages/WaterIntake";

import "./App.css";

function AppShell() {
  const { currentUser, logout } = useAuth();

  return (
    <>
      <header className="app-header">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true" />
          <h1>Fitness Coach</h1>
        </div>
        <div className="app-header-right">
          {currentUser && (
            <Link to="/profile" className="avatar-link" aria-label="Your details">
              <Avatar user={currentUser} />
            </Link>
          )}
          {currentUser && (
            <button type="button" className="logout-btn" onClick={logout}>
              Log out
            </button>
          )}
        </div>
      </header>

      <main className="app-main app-main-with-bottom-nav">
        <Routes>
          <Route path="/" element={<LogWorkout />} />
          <Route path="/history" element={<History />} />
          <Route path="/bests" element={<PersonalBests />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/:id" element={<UserProfile />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/challenges/:id" element={<ChallengeDetail />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/nutrition/water" element={<WaterIntake />} />
        </Routes>
      </main>

      <BottomNav />
      <ExerciseSuggestions />
    </>
  );
}

function Gate() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <p className="empty-state">Loading…</p>;
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <UserProvider>
      <AppShell />
    </UserProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;