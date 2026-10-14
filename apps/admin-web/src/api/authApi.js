import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api/admin";

export async function loginAdmin(payload) {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, payload, {
    withCredentials: true,
  });

  return response.data;
}

export async function getCurrentAdmin() {
  const response = await axios.get(`${API_BASE_URL}/auth/me`, {
    withCredentials: true,
  });

  return response.data;
}

export async function logoutAdmin() {
  const response = await axios.post(
    `${API_BASE_URL}/auth/logout`,
    {},
    {
      withCredentials: true,
    },
  );

  return response.data;
}
