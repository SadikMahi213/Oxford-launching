<<<<<<< HEAD
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",

    accept: "application/json",
  },
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

export default api;
=======
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
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
