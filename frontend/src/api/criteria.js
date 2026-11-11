import apiClient from "./client";

export async function getCriteriaApi() {
  const { data } = await apiClient.get("/criteria");
  return data;
}

export async function createCriterionApi(payload) {
  const { data } = await apiClient.post("/criteria", payload);
  return data;
}

export async function updateCriterionApi(criterionId, payload) {
  const { data } = await apiClient.put(`/criteria/${criterionId}`, payload);
  return data;
}

export async function deleteCriterionApi(criterionId) {
  const { data } = await apiClient.delete(`/criteria/${criterionId}`);
  return data;
}

