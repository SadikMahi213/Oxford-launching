import api from "./axiosInstance.js";
import useUserStore from "../store/userStore.js";

export const submitKYC = (data) => {
  const token = useUserStore.getState().token;

  return api.post("v1/kyc/submit", data, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    },
  });
};
