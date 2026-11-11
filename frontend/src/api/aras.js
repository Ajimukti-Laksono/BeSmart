import apiClient from "./client";

export async function calculateArasApi(periodId, { publish = false } = {}) {
  const { data } = await apiClient.post(`/aras/calculate/${periodId}`, { publish });
  return data;
}

export async function getArasResultsApi(periodId) {
  const { data } = await apiClient.get(`/aras/results/${periodId}`);
  return data;
}

