import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api/admin";

export async function getDashboardSummary() {
  const response = await axios.get(`${API_BASE_URL}/dashboard/summary`, {
    withCredentials: true,
  });

  return response.data;
}
