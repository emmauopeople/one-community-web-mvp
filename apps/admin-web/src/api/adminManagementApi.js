import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api/admin";

export async function getAdmins() {
  const response = await axios.get(`${API_BASE_URL}/admins`, {
    withCredentials: true,
  });

  return response.data;
}

export async function createAdmin(payload) {
  const response = await axios.post(`${API_BASE_URL}/admins`, payload, {
    withCredentials: true,
  });

  return response.data;
}

export async function getAdminById(adminId) {
  const response = await axios.get(`${API_BASE_URL}/admins/${adminId}`, {
    withCredentials: true,
  });

  return response.data;
}

export async function updateAdmin(adminId, payload) {
  const response = await axios.patch(
    `${API_BASE_URL}/admins/${adminId}`,
    payload,
    {
      withCredentials: true,
    },
  );

  return response.data;
}
