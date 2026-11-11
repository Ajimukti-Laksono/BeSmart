/**
 * Mengekstrak pesan error yang mudah dibaca pengguna dari objek error Axios/FastAPI.
 */
export function getErrorMessage(error, fallback = "Terjadi kesalahan. Silakan coba lagi.") {
  if (!error) return fallback;

  const data = error?.response?.data;
  if (data) {
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const firstErr = data.errors[0];
      if (firstErr?.message) {
        return firstErr.field
          ? `${firstErr.field}: ${firstErr.message}`
          : firstErr.message;
      }
    }
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail[0]?.msg || fallback;
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  if (error.message === "Network Error") {
    return "Tidak dapat terhubung ke server API. Pastikan backend sedang berjalan.";
  }

  return error?.message || fallback;
}

