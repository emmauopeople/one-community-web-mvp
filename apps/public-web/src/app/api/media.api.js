import { api } from "./client";

function getApiBaseUrl() {
  const fromAxios = api?.defaults?.baseURL;

  if (fromAxios) {
    return String(fromAxios).replace(/\/$/, "");
  }

  const fromEnv = import.meta.env.VITE_BACKEND_URL;

  if (fromEnv) {
    return String(fromEnv).replace(/\/$/, "");
  }

  return "";
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function uploadSingleImage({
  baseUrl,
  skillId,
  slot,
  file,
  attempt = 1,
}) {
  const formData = new FormData();

  formData.append("images", file, file.name || `skill-image-${slot}`);
  formData.append("sortOrders", JSON.stringify([Number(slot)]));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      `${baseUrl}/media/skills/${skillId}/upload-direct`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
        signal: controller.signal,
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.error || `Upload failed with status ${response.status}`,
      );
    }

    return data;
  } catch (error) {
    if (attempt < 2) {
      await sleep(1000);
      return uploadSingleImage({
        baseUrl,
        skillId,
        slot,
        file,
        attempt: attempt + 1,
      });
    }

    if (error?.name === "AbortError") {
      throw new Error(
        "Upload timed out. Please check your mobile connection and try again.",
      );
    }

    if (error?.message === "Failed to fetch") {
      throw new Error(
        "Upload connection failed. Please check your internet connection and try one image at a time.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const mediaApi = {
  presignSkill: async (skillId, files) =>
    (await api.post(`/media/skills/${skillId}/presign`, { files })).data,

  confirmSkill: async (skillId, items) =>
    (await api.post(`/media/skills/${skillId}/confirm`, { items })).data,

  uploadSkillDirect: async (skillId, filesBySlot) => {
    const baseUrl = getApiBaseUrl();
    const uploadedMedia = [];

    const selected = Object.entries(filesBySlot)
      .map(([slot, file]) => ({
        slot: Number(slot),
        file,
      }))
      .filter((item) => item.file)
      .sort((a, b) => a.slot - b.slot);

    for (const item of selected) {
      const data = await uploadSingleImage({
        baseUrl,
        skillId,
        slot: item.slot,
        file: item.file,
      });

      uploadedMedia.push(...(data.media || []));
    }

    return {
      ok: true,
      media: uploadedMedia,
    };
  },
};
