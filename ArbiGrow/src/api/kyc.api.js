import api from "./axiosInstance.js";
import useUserStore from "../store/userStore.js";

const authHeaders = () => {
  const token = useUserStore.getState().token;
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

export const getActiveKycPackage = async () => {
  const res = await api.get("v1/kyc/active-package", authHeaders());
  return res.data || {};
};

export const submitKYC = (data) => {
  const token = useUserStore.getState().token;

  return api.post("v1/kyc/submit", data, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    },
  });
};
