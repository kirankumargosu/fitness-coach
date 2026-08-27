import { Link } from "react-router-dom";
import { PersonalBestsView } from "../components/PersonalBestsView";
import { useAuth } from "../context/AuthContext";

export function PersonalBests() {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <div>
      <div className="log-form-header">
        <h2 className="section-label">Your personal bests</h2>
        <Link to="/users" className="back-link">
          See other lifters →
        </Link>
      </div>
      <PersonalBestsView user={currentUser} />
    </div>
  );
}