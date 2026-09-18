"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  apiFetch,
  clearToken,
  getToken,
  setToken,
} from "@/lib/api/client";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  ChangePasswordPayload,
  User,
} from "@/lib/api/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await apiFetch<{ id: number } & User>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch<null>("/auth/logout", { method: "POST" });
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const updated = await apiFetch<User>("/profile", {
      method: "PUT",
      body: payload,
    });
    setUser(updated);
  }, []);

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    await apiFetch<null>("/profile/password", {
      method: "PUT",
      body: payload,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiFetch<{ id: number } & User>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
      clearToken();
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
    }),
    [user, loading, login, register, logout, updateProfile, changePassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
