import axios from "axios";

export const TOKEN_STORAGE_KEY = "besmart_access_token";
export const USER_STORAGE_KEY = "besmart_user";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const statusCode = error?.response?.status;
    const reqUrl = error?.config?.url || "";
    const isAuthEndpoint =
      reqUrl.includes("/auth/login") || reqUrl.includes("/auth/register");

    if (statusCode === 401 && !isAuthEndpoint) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      window.dispatchEvent(new Event("besmart:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default apiClient;

