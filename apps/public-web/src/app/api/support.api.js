import { api } from "./client";

export const supportApi = {
  listProviderRequests: async () => {
    const { data } = await api.get("/provider/support-requests");
    return data;
  },

  createProviderRequest: async ({ name, category, subject, description }) => {
    const { data } = await api.post("/provider/support-requests", {
      name,
      category,
      subject,
      description,
    });
    return data;
  },

  getProviderRequest: async (id) => {
    const { data } = await api.get(`/provider/support-requests/${id}`);
    return data;
  },

  addProviderMessage: async (id, message) => {
    const { data } = await api.post(
      `/provider/support-requests/${id}/messages`,
      {
        message,
      },
    );
    return data;
  },
};
