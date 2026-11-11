import apiClient from "./client";

export async function loginApi(payload) {
  const { data } = await apiClient.post("/auth/login", payload);
  return data;
}

export async function registerApi(payload) {
  const { data } = await apiClient.post("/auth/register", payload);
  return data;
}

export async function getMeApi() {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

