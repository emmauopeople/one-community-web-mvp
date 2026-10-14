import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api/admin";

export async function getAdminLoginMonitoring(minutes = 15) {
  const response = await axios.get(`${API_BASE_URL}/monitoring/admin-logins`, {
    params: { minutes },
    withCredentials: true,
  });

  return response.data;
}

export async function getProviderLoginMonitoring(minutes = 15) {
  const response = await axios.get(
    `${API_BASE_URL}/monitoring/provider-logins`,
    {
      params: { minutes },
      withCredentials: true,
    },
  );

  return response.data;
}
