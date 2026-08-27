import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { User } from "../api/types";
import { useAuth } from "./AuthContext";

/** Which user's data is currently being VIEWED — separate from who's
 * logged in (see AuthContext). Anyone logged in can view anyone's data;
 * only editing is restricted (enforced by the backend + role-aware UI). */
interface UserContextValue {
  users: User[];
  activeUser: User | null;
  setActiveUser: (user: User) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

const STORAGE_KEY = "iron-log-active-user";

export function UserProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getUsers()
      .then((fetched) => {
        setUsers(fetched);
        const savedId = localStorage.getItem(STORAGE_KEY);
        const saved = fetched.find((u) => String(u.id) === savedId);
        const selfMatch = currentUser
          ? fetched.find((u) => u.id === currentUser.id)
          : undefined;
        // Priority: an explicit manual choice saved on this device, then
        // whoever is logged in, then just the first user.
        setActiveUserState(saved ?? selfMatch ?? fetched[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  const setActiveUser = (user: User) => {
    setActiveUserState(user);
    localStorage.setItem(STORAGE_KEY, String(user.id));
  };

  return (
    <UserContext.Provider value={{ users, activeUser, setActiveUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUsers must be used within a UserProvider");
  return ctx;
}