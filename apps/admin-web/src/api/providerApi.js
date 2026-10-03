import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api/admin";

export async function getProviders() {
  const response = await axios.get(`${API_BASE_URL}/providers`, {
    withCredentials: true,
  });

  return response.data;
}

export async function updateProviderStatus(providerId, status) {
  const response = await axios.patch(
    `${API_BASE_URL}/providers/${providerId}/status`,
    { status },
    {
      withCredentials: true,
    },
  );

  return response.data;
}

export async function getProviderById(providerId) {
  const response = await axios.get(`${API_BASE_URL}/providers/${providerId}`, {
    withCredentials: true,
  });

  return response.data;
}

export async function updateProvider(providerId, payload) {
  const response = await axios.patch(
    `${API_BASE_URL}/providers/${providerId}`,
    payload,
    {
      withCredentials: true,
    },
  );

  return response.data;
}
