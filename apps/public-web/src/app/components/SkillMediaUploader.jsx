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

//helper function to compress images on the client side before upload, to save bandwidth and speed up upload times
async function compressImageIfNeeded(file) {
  const mime = normalizeMime(file.type, file.name);

  // Only compress normal image types
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
    return file;
  }

  // If already under 2.5MB, keep original
  const targetBytes = 2.5 * 1024 * 1024;
  if (file.size <= targetBytes) {
    return file;
  }
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageUrl;
    });
    const maxDimension = 1600;
    let { width, height } = img;
    if (width > height && width > maxDimension) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else if (height > maxDimension) {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    const compressedBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.75);
    });
    if (!compressedBlob) {
      return file;
    }
    const compressedFile = new File(
      [compressedBlob],
      file.name.replace(/\.(png|webp|jpg|jpeg)$/i, ".jpg"),
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      },
    );
    console.log("IMAGE COMPRESSED:", {
      originalName: file.name,
      originalSize: file.size,
      compressedSize: compressedFile.size,
    });
    return compressedFile;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
export default function SkillMediaUploader({ skillId, onUploaded, onError }) {
  useLocale();
  const [filesBySlot, setFilesBySlot] = useState({
    0: null,
    1: null,
    2: null,
  });
  const [busy, setBusy] = useState(false);
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
    try {
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
    }
  };
  const upload = async () => {
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
      console.log("MEDIA DIRECT UPLOAD STARTING:", {
        skillId,
        selectedCount: selected.length,
        files: selected.map(({ slot, file }) => ({
          slot,
          name: file.name,
       …22381 tokens truncated…tus updated successfully.": "Provider status updated successfully.",
  "Profile Reviewed": "Profile Reviewed",
  "Skills": "Skills",
  "Skill": "Skill",
  "Skill Details": "Skill Details",
  "Listed Skills": "Listed Skills",
  "Total Skills": "Total Skills",
  "Total Skills:": "Total Skills:",
  "Total Providers": "Total Providers",
  "Total Providers:": "Total Providers:",
  "Active Providers": "Active Providers",
  "Open Requests": "Open Requests",
  "Skill updated successfully.": "Skill updated successfully.",
  "Search by name, email, or phone": "Search by name, email, or phone",
  "Search by provider or title": "Search by provider or title",
  "Search by title, category, city, or provider": "Search by title, category, city, or provider",
  "No providers found.": "No providers found.",
  "No skills found.": "No skills found.",
  "No skill data available.": "No skill data available.",
  "No data available.": "No data available.",
  "No recent activity.": "No recent activity.",
  "No recent login activity.": "No recent login activity.",
  "No contact clicks available.": "No contact clicks available.",
  "No daily activity available.": "No daily activity available.",
  "No admins found.": "No admins found.",
  "No name": "No name",
  "No phone": "No phone",
  "No city": "No city",
  "No category": "No category",
  "Save Updates": "Save Updates",
  "Created": "Created",
  "Created:": "Created:",
  "Last updated:": "Last updated:",
  "Contact Channels": "Contact Channels",
  "Contact Clicks": "Contact Clicks",
  "Skill Views": "Skill Views",
  "Total Events": "Total Events",
  "Search → View": "Search → View",
  "View → Contact": "View → Contact",
  "Daily Activity": "Daily Activity",
  "Blue: Searches": "Blue: Searches",
  "Green: Skill Views": "Green: Skill Views",
  "Amber: Contact Clicks": "Amber: Contact Clicks",
  "Top Contacted Skills": "Top Contacted Skills",
  "Top Viewed Skills": "Top Viewed Skills",
  "Top Searched Categories": "Top Searched Categories",
  "Top Searched Cities": "Top Searched Cities",
  "WhatsApp Clicks": "WhatsApp Clicks",
  "Email Clicks": "Email Clicks",
  "Skill views divided by searches": "Skill views divided by searches",
  "Contact clicks divided by skill views": "Contact clicks divided by skill views",
  "Recent Activity": "Recent Activity",
  "Login Monitoring": "Login Monitoring",
  "Admin Login Overview": "Admin Login Overview",
  "Provider Login Overview": "Provider Login Overview",
  "Recent Admin Login Activity": "Recent Admin Login Activity",
  "Total Attempts": "Total Attempts",
  "Total Login Attempts": "Total Login Attempts",
  "Successful Admin Logins": "Successful Admin Logins",
  "Failed Admin Logins": "Failed Admin Logins",
  "Successful Provider Logins": "Successful Provider Logins",
  "Failed Provider Logins": "Failed Provider Logins",
  "Create Admin": "Create Admin",
  "Admin Details": "Admin Details",
  "Full Name": "Full Name",
  "Full name, email, and role are required.": "Full name, email, and role are required.",
  "Change Password": "Change Password",
  "Forgot Password": "Forgot Password",
  "Forgot Password?": "Forgot Password?",
  "Reset Password": "Reset Password",
  "New Password": "New Password",
  "Confirm Password": "Confirm Password",
  "Confirm new password": "Confirm new password",
  "Enter new password": "Enter new password",
  "Enter password": "Enter password",
  "Send Code": "Send Code",
  "Verify Code": "Verify Code",
  "Enter and confirm your new password.": "Enter and confirm your new password.",
  "Enter your admin email and we will send a verification code.": "Enter your admin email and we will send a verification code.",
  "Sign in to access the admin dashboard.": "Sign in to access the admin dashboard.",
  "New password must be at least 8 characters.": "New password must be at least 8 characters.",
  "Passwords do not match.": "Passwords do not match.",
  "Back Home": "Back Home",
  "Back to Login": "Back to Login",
  "One Community Admin": "One Community Admin",
  "One Community Admin Dashboard": "One Community Admin Dashboard",
  "One Community logo": "One Community logo",
  "One Community — Provider Portal": "One Community — Provider Portal",
  "One Community — Provider Requests": "One Community — Provider Requests",
  "How to use this dashboard": "How to use this dashboard",
  "Quick actions": "Quick actions",
  "Manage providers": "Manage providers",
  "Review skills": "Review skills",
  "Review open requests": "Review open requests",
  "View analytics": "View analytics",
  "View all registered provider accounts.": "View all registered provider accounts.",
  "Manage listed skills and service visibility.": "Manage listed skills and service visibility.",
  "Respond to public messages and provider requests.": "Respond to public messages and provider requests.",
  "Use this dashboard to manage providers, review skills, respond to public and provider requests, monitor platform activity, and track user engagement across One Community.": "Use this dashboard to manage providers, review skills, respond to public and provider requests, monitor platform activity, and track user engagement across One Community.",
  "1. Manage providers": "1. Manage providers",
  "2. Review skills": "2. Review skills",
  "3. Respond to requests": "3. Respond to requests",
  "4. Monitor activity": "4. Monitor activity",
  "Use the Providers section to review registered providers, check their status, and activate or deactivate accounts when needed.": "Use the Providers section to review registered providers, check their status, and activate or deactivate accounts when needed.",
  "Use the Skills section to inspect provider services, review descriptions, and manage skill visibility.": "Use the Skills section to inspect provider services, review descriptions, and manage skill visibility.",
  "Use the Requests section to handle public messages and provider support requests. Public users receive replies by email, while providers can track notes in their portal.": "Use the Requests section to handle public messages and provider support requests. Public users receive replies by email, while providers can track notes in their portal.",
  "Use Analytics and System pages to monitor searches, skill views, contact clicks, login attempts, and system health.": "Use Analytics and System pages to monitor searches, skill views, contact clicks, login attempts, and system health.",
  "Complete": "Complete",
  "Incomplete": "Incomplete",
  "Denied": "Denied",
  "Remove": "Remove",
  "Reason": "Reason",
  ". Submit requests to admin and track responses/status here.": ". Submit requests to admin and track responses/status here.",
  "Cameroon. Save the place where you provide services. New skills use this location automatically.": "Cameroon. Save the place where you provide services. New skills use this location automatically.",
  "Category:": "Category:",
  "Display name: 2–60 chars • Phone: digits only (optionally +), 8–15 digits.": "Display name: 2–60 chars • Phone: digits only (optionally +), 8–15 digits.",
  "My Skills is": "My Skills is",
  "One Community — Provider Portal is running": "One Community — Provider Portal is running",
  "clicks •": "clicks •",
  "• Messages:": "• Messages:",
  "Display name must be 2–60 characters (your name or business name).": "Display name must be 2–60 characters (your name or business name).",
  "Display name must be 2–60 characters.": "Display name must be 2–60 characters.",
  "Withdraw GPS consent? Your listings will no longer appear publicly until you complete location setup again.": "Withdraw GPS consent? Your listings will no longer appear publicly until you complete location setup again.",
  "Failed to load admin": "Failed to load admin",
  "Failed to load admin.": "Failed to load admin.",
  "Failed to load admin details": "Failed to load admin details",
  "Failed to load admin details.": "Failed to load admin details.",
  "Failed to load admin monitoring": "Failed to load admin monitoring",
  "Failed to load admin monitoring.": "Failed to load admin monitoring.",
  "Failed to load admins": "Failed to load admins",
  "Failed to load admins.": "Failed to load admins.",
  "Failed to load business analytics": "Failed to load business analytics",
  "Failed to load business analytics.": "Failed to load business analytics.",
  "Failed to load dashboard": "Failed to load dashboard",
  "Failed to load dashboard.": "Failed to load dashboard.",
  "Failed to load monitoring data": "Failed to load monitoring data",
  "Failed to load monitoring data.": "Failed to load monitoring data.",
  "Failed to load profile": "Failed to load profile",
  "Failed to load profile.": "Failed to load profile.",
  "Failed to load provider details": "Failed to load provider details",
  "Failed to load provider details.": "Failed to load provider details.",
  "Failed to load provider monitoring": "Failed to load provider monitoring",
  "Failed to load provider monitoring.": "Failed to load provider monitoring.",
  "Failed to load providers": "Failed to load providers",
  "Failed to load providers.": "Failed to load providers.",
  "Failed to load request details": "Failed to load request details",
  "Failed to load request details.": "Failed to load request details.",
  "Failed to load requests": "Failed to load requests",
  "Failed to load requests.": "Failed to load requests.",
  "Failed to load skill details": "Failed to load skill details",
  "Failed to load skill details.": "Failed to load skill details.",
  "Failed to load skills": "Failed to load skills",
  "Failed to load skills.": "Failed to load skills.",
  "Failed to create admin": "Failed to create admin",
  "Failed to create admin.": "Failed to create admin.",
  "Failed to create request": "Failed to create request",
  "Failed to create request.": "Failed to create request.",
  "Failed to update admin": "Failed to update admin",
  "Failed to update admin.": "Failed to update admin.",
  "Failed to update profile": "Failed to update profile",
  "Failed to update profile.": "Failed to update profile.",
  "Failed to update provider": "Failed to update provider",
  "Failed to update provider.": "Failed to update provider.",
  "Failed to update provider status": "Failed to update provider status",
  "Failed to update provider status.": "Failed to update provider status.",
  "Failed to update request": "Failed to update request",
  "Failed to update request.": "Failed to update request.",
  "Failed to update skill": "Failed to update skill",
  "Failed to update skill.": "Failed to update skill.",
  "Failed to send message": "Failed to send message",
  "Failed to send message.": "Failed to send message.",
  "Failed to open request": "Failed to open request",
  "Failed to open request.": "Failed to open request.",
  "Loading admin details...": "Loading admin details...",
  "Loading admins...": "Loading admins...",
  "Loading business analytics...": "Loading business analytics...",
  "Loading conversation...": "Loading conversation...",
  "Loading dashboard...": "Loading dashboard...",
  "Loading login monitoring...": "Loading login monitoring...",
  "Loading monitoring...": "Loading monitoring...",
  "Loading provider details...": "Loading provider details...",
  "Loading providers...": "Loading providers...",
  "Loading recent activity...": "Loading recent activity...",
  "Loading request details...": "Loading request details...",
  "Loading requests...": "Loading requests...",
  "Loading skill details...": "Loading skill details...",
  "Loading skills...": "Loading skills...",
  "Last 7 days": "Last 7 days",
  "Last 14 days": "Last 14 days",
  "Last 30 days": "Last 30 days",
  "Last 90 days": "Last 90 days",
  "Last 6 hours": "Last 6 hours",
  "Last 24 hours": "Last 24 hours",
  "Last 15 minutes": "Last 15 minutes",
  "Last 60 minutes": "Last 60 minutes",
  "title": "title",
  "category": "category",
  "description": "description",
  "skills": "skills",
  "found": "found",
  "Searches": "Searches",
  "One Community": "One Community",
  "Cameroon": "Cameroon",
  "Language": "Language",
  "Provider →": "Provider →",
  "Uploading...": "Uploading...",
  "Sending...": "Sending...",
  "Completing…": "Completing…",
  "Submitting...": "Submitting...",
  "You": "You",
  "Write a follow-up message...": "Write a follow-up message...",
  "Send Follow-up": "Send Follow-up",
  "Searching…": "Searching…",
  "Searching...": "Searching...",
  "Locating…": "Locating…",
  " within this radius. Choose a wider radius or turn off nearby.": " within this radius. Choose a wider radius or turn off nearby.",
  ". Try a service, city or area.": ". Try a service, city or area.",
  "Saving...": "Saving...",
  "Creating...": "Creating...",
  "Unknown": "Unknown",
  "Updating...": "Updating...",
  "Deactivate": "Deactivate",
  "Activate": "Activate",
  "Update": "Update",
  "success": "success",
  "failed": "failed",
  "S3_BUCKET not configured": "S3_BUCKET not configured",
  "GPS-use consent is required to create a provider account.": "GPS-use consent is required to create a provider account.",
  "Confirm that this is your operating location.": "Confirm that this is your operating location.",
  "Choose a Cameroon region and enter division, town/city and area.": "Choose a Cameroon region and enter division, town/city and area.",
  "Please capture your operating location again.": "Please capture your operating location again.",
  "First and last name are required (up to 60 characters each). Business name is optional (up to 60 characters).": "First and last name are required (up to 60 characters each). Business name is optional (up to 60 characters).",
  "Enter a name, valid email, rating (1–5), review (20–2,000 characters), and publication consent.": "Enter a name, valid email, rating (1–5), review (20–2,000 characters), and publication consent.",
  "Review changed or is unavailable. Refresh the queue before deciding.": "Review changed or is unavailable. Refresh the queue before deciding.",
  "Choose a decision, add notes (5–1,000 characters), and confirm verification before approval.": "Choose a decision, add notes (5–1,000 characters), and confirm verification before approval.",
  "Unable to load review queue.": "Unable to load review queue.",
  "Unable to save review decision.": "Unable to save review decision.",
  "Active admin access required.": "Active admin access required.",
  "Network Error": "Network Error",
  "Registration changed or completed. Please sign in or restart.": "Registration changed or completed. Please sign in or restart.",
  " · about {distance} km": " · about {distance} km",
  "WhatsApp unavailable": "WhatsApp unavailable",
  "Please contact {provider} directly.": "Please contact {provider} directly.",
  "the provider": "the provider",
  "Hello, I am interested in {title}. Please contact me with more details.": "Hello, I am interested in {title}. Please contact me with more details.",
  "Hello, I found your service on One Community: {title}": "Hello, I found your service on One Community: {title}",
  "Hello, I found your service on One Community. I am interested in {title}.": "Hello, I found your service on One Community. I am interested in {title}.",
  "Missing information": "Missing information",
  "Missing service": "Missing service",
  "Please select a service before sending an inquiry.": "Please select a service before sending an inquiry.",
  "Inquiry sent": "Inquiry sent",
  "Your inquiry was sent successfully. The provider can reply to your email.": "Your inquiry was sent successfully. The provider can reply to your email.",
  "Inquiry failed": "Inquiry failed",
  "Failed to send inquiry. Please try again.": "Failed to send inquiry. Please try again.",
  "Partly cloudy": "Partly cloudy",
  "Overcast": "Overcast",
  "Drizzle": "Drizzle",
  "Rain showers": "Rain showers",
  "Snow showers": "Snow showers",
  "No pending reviews.": "No pending reviews.",
  "No approved reviews.": "No approved reviews.",
  "No inactive reviews.": "No inactive reviews.",
  "No rejected reviews.": "No rejected reviews.",
  "No deleted reviews.": "No deleted reviews.",
  "Unable to open service": "Unable to open service",
  "Unable to open provider profile": "Unable to open provider profile",
  "Unable to load more listings": "Unable to load more listings",
  "Please retry.": "Please retry."
}
