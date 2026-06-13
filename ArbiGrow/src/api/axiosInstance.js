import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",

    accept: "application/json",
  },
  withCredentials: true,
});

export default api;
