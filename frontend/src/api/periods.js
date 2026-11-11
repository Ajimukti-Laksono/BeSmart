import apiClient from "./client";

export async function getPeriodsApi(params = {}) {
  const { data } = await apiClient.get("/periods", { params });
  return data;
}

export async function createPeriodApi(payload) {
  const { data } = await apiClient.post("/periods", payload);
  return data;
}

export async function updatePeriodApi(periodId, payload) {
  const { data } = await apiClient.put(`/periods/${periodId}`, payload);
  return data;
}

export async function updatePeriodStatusApi(periodId, payload) {
  const { data } = await apiClient.patch(`/periods/${periodId}/status`, payload);
  return data;
}

export async function deletePeriodApi(periodId) {
  const { data } = await apiClient.delete(`/periods/${periodId}`);
  return data;
}

