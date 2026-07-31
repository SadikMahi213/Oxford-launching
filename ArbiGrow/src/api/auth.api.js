import api from "./axiosInstance.js";

export const registerUser = (data) => {
  // console.log(data);
  return api.post("v1/auth/signup", data);
};

export const loginUser = (data) => {
  return api.post("v1/auth/login", data);
};

export const forgotPassword = (data) => {
  return api.post("v1/auth/forgot-password", data);
};

export const resetPassword = (newPassword, token) => {
  return api.post("v1/auth/reset-password", {
    new_password: newPassword,
    token: token,
  });
};

export const logoutUser = () => {
  return api.post("v1/auth/logout");
};

export const verifyEmail = (data) => {
  return api.post("v1/auth/verify-email", data);
};

export const resendVerificationEmail = (email) => {
  return api.post("v1/auth/resend-verification", { email });
};

export const refreshToken = () => {
  return api.post("v1/auth/refresh");
};
