import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { User } from "../api/types";

interface UserContextValue {
  users: User[];
  activeUser: User | null;
  setActiveUser: (user: User) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

const STORAGE_KEY = "iron-log-active-user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getUsers(), api.whoami()])
      .then(([fetched, authUser]) => {
        setUsers(fetched);
        const savedId = localStorage.getItem(STORAGE_KEY);
        const saved = fetched.find((u) => String(u.id) === savedId);
        const authMatch = authUser
          ? fetched.find((u) => u.id === authUser.id)
          : undefined;
        // Priority: an explicit manual choice saved on this device, then
        // whoever authenticated via Basic Auth, then just the first user.
        setActiveUserState(saved ?? authMatch ?? fetched[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

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