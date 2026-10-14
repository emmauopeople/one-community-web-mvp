import { api } from "./client";

export const skillsApi = {
  // Provider
  providerList: async () => (await api.get("/provider/skills")).data, // { skills }
  providerCreate: async (payload) =>
    (await api.post("/provider/skills", payload)).data, // { skill }
  providerUpdate: async (id, payload) =>
    (await api.put(`/provider/skills/${id}`, payload)).data, // { skill }
  providerDelete: async (id) =>
    (await api.delete(`/provider/skills/${id}`)).data, // { ok }

  // Public
  publicSearch: async (params) =>
    (await api.get("/skills/search", { params })).data, // { results }
  getSkillDetail: async (id) => (await api.get(`/skills/${id}`)).data, // { skill, media }
};
