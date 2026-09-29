import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api/admin";

export async function getEventSummary(days = 7) {
  const response = await axios.get(`${API_BASE_URL}/analytics/events-summary`, {
    params: { days },
    withCredentials: true,
  });

  return response.data;
}

export async function getTopCities(days = 7) {
  const response = await axios.get(`${API_BASE_URL}/analytics/top-cities`, {
    params: { days },
    withCredentials: true,
  });

  return response.data;
}

export async function getTopCategories(days = 7) {
  const response = await axios.get(`${API_BASE_URL}/analytics/top-categories`, {
    params: { days },
    withCredentials: true,
  });

  return response.data;
}

export async function getContactChannels(days = 7) {
  const response = await axios.get(
    `${API_BASE_URL}/analytics/contact-channels`,
    {
      params: { days },
      withCredentials: true,
    },
  );

  return response.data;
}

export async function getTopViewedSkills(days = 7) {
  const response = await axios.get(
    `${API_BASE_URL}/analytics/top-viewed-skills`,
    {
      params: { days },
      withCredentials: true,
    },
  );

  return response.data;
}

export async function getTopContactedSkills(days = 7) {
  const response = await axios.get(
    `${API_BASE_URL}/analytics/top-contacted-skills`,
    {
      params: { days },
      withCredentials: true,
    },
  );

  return response.data;
}

export async function getDailyActivity(days = 7) {
  const response = await axios.get(`${API_BASE_URL}/analytics/daily-activity`, {
    params: { days },
    withCredentials: true,
  });

  return response.data;
}
