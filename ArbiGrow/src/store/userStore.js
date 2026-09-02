// /store/userStore.js
import { create } from "zustand";
import { logoutUser } from "../api/auth.api.js";

// No localStorage persistence for security reasons.
// JWT is stored in httpOnly cookie (XSS-safe) and optionally in memory for Authorization header.

const useUserStore = create((set, get) => ({
  user: null,
  token: null,
  userDetails: null,
  viewingUserId: null,

  setUser: (newUserData) => {
    const currentUser = get().user || {};
    const updatedUser = {
      ...currentUser,
      ...newUserData,
    };
    set({ user: updatedUser });
  },

  setToken: (token) => {
    set({ token: token || null });
  },

  setUserDetails: (details) => {
    set({ userDetails: details });
  },

  setViewingUserId: (id) => {
    set({ viewingUserId: id });
  },

  logout: async () => {
    try {
      await logoutUser();
    } catch {
      // Clear local state even if API call fails
    }
    set({ user: null, token: null, userDetails: null, viewingUserId: null });
  },
}));

export default useUserStore;
