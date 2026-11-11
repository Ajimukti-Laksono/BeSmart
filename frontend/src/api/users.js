import apiClient from "./client";

export async function getUsersApi(params = {}) {
  const { data } = await apiClient.get("/users", { params });
  return data;
}

export async function createUserApi(payload) {
  const { data } = await apiClient.post("/users", payload);
  return data;
}

export async function updateUserApi(userId, payload) {
  const { data } = await apiClient.put(`/users/${userId}`, payload);
  return data;
}

export async function deleteUserApi(userId) {
  const { data } = await apiClient.delete(`/users/${userId}`);
  return data;
}

