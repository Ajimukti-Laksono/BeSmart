import apiClient from "./client";

export async function getApplicantsApi(params = {}) {
  const { data } = await apiClient.get("/applicants", { params });
  return data;
}

export async function getApplicantApi(applicantId) {
  const { data } = await apiClient.get(`/applicants/${applicantId}`);
  return data;
}

export async function createApplicantApi(payload) {
  const { data } = await apiClient.post("/applicants", payload);
  return data;
}

export async function updateApplicantApi(applicantId, payload) {
  const { data } = await apiClient.put(`/applicants/${applicantId}`, payload);
  return data;
}

export async function saveApplicantScoresApi(applicantId, scores) {
  const { data } = await apiClient.put(`/applicants/${applicantId}/scores`, { scores });
  return data;
}

export async function uploadBerkasApi(applicantId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post(`/applicants/${applicantId}/berkas`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchBerkasBlobApi(applicantId) {
  const response = await apiClient.get(`/applicants/${applicantId}/berkas`, {
    responseType: "blob",
  });
  return {
    blob: response.data,
    contentType: response.headers["content-type"] || "application/octet-stream",
  };
}

export async function verifyApplicantApi(applicantId, statusVerifikasi) {
  const { data } = await apiClient.patch(`/applicants/${applicantId}/verify`, {
    status_verifikasi: statusVerifikasi,
  });
  return data;
}

