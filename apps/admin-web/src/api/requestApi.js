import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api/admin";

export async function getRequests(status = "all", type = "provider") {
  const response = await axios.get(`${API_BASE_URL}/requests`, {
    params: { status, type },
    withCredentials: true,
  });

  return response.data;
}

export async function getRequestById(requestId) {
  const response = await axios.get(`${API_BASE_URL}/requests/${requestId}`, {
    withCredentials: true,
  });

  return response.data;
}

export async function updateRequest(requestId, payload) {
  const response = await axios.patch(
    `${API_BASE_URL}/requests/${requestId}`,
    payload,
    {
      withCredentials: true,
    },
  );

  return response.data;
}

export async function addRequestNote(requestId, note) {
  const response = await axios.post(
    `${API_BASE_URL}/requests/${requestId}/notes`,
    { note },
    {
      withCredentials: true,
    },
  );

  return response.data;
}
