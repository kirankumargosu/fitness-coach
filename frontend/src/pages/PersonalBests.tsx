import { Link } from "react-router-dom";
import { PersonalBestsView } from "../components/PersonalBestsView";
import { BadgesView } from "../components/BadgesView";
import { useAuth } from "../context/AuthContext";

export function PersonalBests() {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <div>
      <div className="log-form-header">
        {/* <h2 className="section-label">Achievements</h2> */}
        <h2>Achievements</h2>
        <div className="pb-links">
          {/* <Link to="/challenges" className="back-link">
            Challenges →
          </Link> */}
          <Link to="/users" className="back-link">
            See other lifters →
          </Link>
        </div>
      </div>
      <details className="personal-bests-entry">
        <summary>Badges</summary>
        <BadgesView user={currentUser} />
      </details>
      <details className="personal-bests-entry">
        <summary>Personal Bests</summary>
        <PersonalBestsView user={currentUser} />
      </details>
    </div>
  );
}