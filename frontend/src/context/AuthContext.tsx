import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, apiErrorMessage } from "../api/client";
import type { User } from "../api/types";

interface AuthContextValue {
  currentUser: User | null;
  loading: boolean;
  login: (name: string, password: string) => Promise<void>;
  register: (name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
  }, []);

  const login = async (name: string, password: string) => {
    try {
      const user = await api.login(name, password);
      setCurrentUser(user);
    } catch (err) {
      throw new Error(apiErrorMessage(err, "Couldn't log in — try again."));
    }
  };

  const register = async (name: string, password: string) => {
    try {
      const user = await api.register(name, password);
      setCurrentUser(user);
    } catch (err) {
      throw new Error(apiErrorMessage(err, "Couldn't register — try again."));
    }
  };

  const logout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}