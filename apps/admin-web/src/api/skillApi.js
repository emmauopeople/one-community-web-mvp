import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api/admin";

export async function getSkills() {
  const response = await axios.get(`${API_BASE_URL}/skills`, {
    withCredentials: true,
  });

  return response.data;
}

export async function getSkillById(skillId) {
  const response = await axios.get(`${API_BASE_URL}/skills/${skillId}`, {
    withCredentials: true,
  });

  return response.data;
}

export async function updateSkill(skillId, payload) {
  const response = await axios.patch(
    `${API_BASE_URL}/skills/${skillId}`,
    payload,
    {
      withCredentials: true,
    },
  );

  return response.data;
}
