"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, setCookie, getCookie, deleteCookie } from "@/lib/api";

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_admin: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: Record<string, any>) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const checkAuth = async () => {
    setIsLoading(true);
    const token = getCookie("token");
    const refreshToken = getCookie("refresh_token");

    if (!token && !refreshToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      if (token) {
        // Fetch current user details
        const resp = await apiRequest("/users/me");
        setUser(resp.data);
      } else if (refreshToken) {
        // Try refresh token flow
        const resp = await apiRequest("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        
        // Save new tokens
        setCookie("token", resp.data.access_token, 3600); // 1 hour
        setCookie("refresh_token", resp.data.refresh_token, 7 * 86400); // 7 days

        // Fetch user profile
        const userResp = await apiRequest("/users/me");
        setUser(userResp.data);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      // Clean up invalid cookies
      deleteCookie("token");
      deleteCookie("refresh_token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const resp = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Save tokens in cookies
    setCookie("token", resp.data.access_token, 3600);
    setCookie("refresh_token", resp.data.refresh_token, 7 * 86400);

    // Fetch user profile
    const userResp = await apiRequest("/users/me");
    setUser(userResp.data);
    router.push("/dashboard");
  };

  const register = async (payload: Record<string, any>) => {
    await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };

  const logout = () => {
    deleteCookie("token");
    deleteCookie("refresh_token");
    setUser(null);
    router.push("/login");
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
