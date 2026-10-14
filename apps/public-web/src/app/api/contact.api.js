import { api } from "./client";

export const contactApi = {
  emailInquiry: async ({ skillId, fromEmail, message }) =>
    (await api.post("/contact/email", { skillId, fromEmail, message })).data,
};
