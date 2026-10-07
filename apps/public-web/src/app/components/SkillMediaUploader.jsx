import { t, te, useLocale } from "../../i18n/index.js";
import React, { useMemo, useState } from "react";
import { mediaApi } from "../api/media.api";
const MAX_BYTES = 3 * 1024 * 1024; // 3MB, must match backend
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
function normalizeMime(type, name = "") {
  const cleanType = String(type || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  if (cleanType === "image/jpg") return "image/jpeg";
  if (cleanType === "image/jpeg") return "image/jpeg";
  if (cleanType === "image/png") return "image/png";
  if (cleanType === "image/webp") return "image/webp";
  const fileName = String(name || "").toLowerCase();
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (fileName.endsWith(".png")) {
    return "image/png";
  }
  if (fileName.endsWith(".webp")) {
    return "image/webp";
  }
  return cleanType;
}

import { compressImageIfNeeded } from "../../utils/imageCompression.js";
export default function SkillMediaUploader({ skillId, onUploaded, onError }) {
  useLocale();
  const [filesBySlot, setFilesBySlot] = useState({
    0: null,
    1: null,
    2: null,
  });
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [notice, setNotice] = useState({
    type: "",
    text: "",
  });
  const showError = (text) => {
    setNotice({
      type: "error",
      text,
    });
    onError?.(text);
  };
  const showSuccess = (text) => {
    setNotice({
      type: "success",
      text,
    });
  };
  const selected = useMemo(() => {
    return [0, 1, 2]
      .map((slot) => {
        const file = filesBySlot[slot];
        if (!file) return null;
        return {
          slot,
          file,
        };
      })
      .filter(Boolean);
  }, [filesBySlot]);
  const setSlot = async (slot, file) => {
    setNotice({
      type: "",
      text: "",
    });
    if (!file) {
      return setFilesBySlot((previous) => ({
        ...previous,
        [slot]: null,
      }));
    }
    setPreparing(true);
    try {
      if (!ALLOWED.has(normalizeMime(file.type,file.name))) return showError("Only JPG, PNG, or WEBP images are allowed.");
      const compressedFile = await compressImageIfNeeded(file);
      const mime = normalizeMime(compressedFile.type, compressedFile.name);
      if (!ALLOWED.has(mime)) {
        return showError("Only JPG, PNG, or WEBP images are allowed.");
      }
      if (compressedFile.size > MAX_BYTES) {
        return showError(
          "Image is still too large after compression. Please choose a smaller image.",
        );
      }
      setFilesBySlot((previous) => ({
        ...previous,
        [slot]: compressedFile,
      }));
    } catch (error) {
      console.error("IMAGE COMPRESSION FAILED:", error);
      showError("Could not prepare this image. Please try another image.");
    } finally {
      setPreparing(false);
    }
  };
  const upload = async () => {
    if (busy || preparing) return;
    try {
      setNotice({
        type: "",
        text: "",
      });
      if (!skillId) {
        return showError("Create the skill first.");
      }
      if (selected.length === 0) {
        return showError("Select at least one image.");
      }
      setBusy(true);
      const done = await mediaApi.uploadSkillDirect(skillId, filesBySlot);
      showSuccess("✅ Images uploaded.");
      setFilesBySlot({
        0: null,
        1: null,
        2: null,
      });
      onUploaded?.(done.media || []);
    } catch (error) {
      console.error("MEDIA DIRECT UPLOAD FAILED:", error);
      showError(
        error?.response?.data?.error ||
          error?.message ||
          "Upload failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const noticeClass =
    notice.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : notice.type === "error"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "";
  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">{t("Skill images (max 3)")}</div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((slot) => {
          const file = filesBySlot[slot];
          const inputId = `skill-img-slot-${slot}`;
          return (
            <div
              key={slot}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              <div className="mb-2 text-xs text-slate-600">
                {t("Slot") + " "}
                {slot + 1}
              </div>

              <input
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy || preparing}
                onChange={(event) => {
                  setSlot(slot, event.target.files?.[0] || null);
                  event.target.value = "";
                }}
                className="hidden"
              />

              <label
                htmlFor={inputId}
                className={`inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-900 transition hover:bg-slate-200 active:scale-[0.99] ${busy || preparing ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {t("Choose file")}
              </label>

              <div className="mt-2 truncate text-xs text-slate-600">
                {file ? file.name : t("No file chosen")}
              </div>

              {file ? (
                <button
                  type="button"
                  disabled={busy || preparing}
                  onClick={() => setSlot(slot, null)}
                  className="mt-2 text-xs text-blue-700 hover:underline disabled:opacity-60"
                >
                  {t("Remove")}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {notice.text ? (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${noticeClass}`}
        >
          {t(notice.text)}
        </div>
      ) : null}

      <button
        type="button"
        disabled={busy || preparing}
        onClick={upload}
        className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
      >
        {preparing ? t("Preparing images...") : busy ? t("Uploading...") : t("Upload selected images")}
      </button>

      <div className="mt-2 text-xs text-slate-500">
        {t(
          "Images upload through the secure backend API, then are stored in private S3.",
        )}
      </div>
    </div>
  );
}
