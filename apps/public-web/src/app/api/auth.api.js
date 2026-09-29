import { api } from "./client";

export const authApi = {
  me: async () => (await api.get("/auth/me")).data,

  login: async ({ email, password }) =>
    (await api.post("/auth/login", { email, password })).data,

  logout: async () => (await api.post("/auth/logout")).data,

  beginRegistration: async ({
    email,
    phone,
    method,
    password,
    displayName,
  }) => {
    const { data } = await api.post("/auth/provider/begin", {
      email,
      phone,
      method,
      password,
      displayName,
    });
    return data;
  },

  completeRegistration: async ({ email, otp }) =>
    (await api.post("/auth/provider/complete", { email, otp })).data,

  providerProfile: async () => {
    const { data } = await api.get("/provider/profile");
    return data; // { profile }
  },

  updateProviderProfile: async ({ displayName, phone }) => {
    const { data } = await api.put("/provider/profile", { displayName, phone });
    return data; // { ok, profile }
  },
};
