import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const { get, post, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock("axios", () => ({ default: { create: () => ({ get, post, patch }) } }));
vi.mock("../components/layout/DashboardLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("../i18n/index.js", () => ({ t: (s) => s, useLocale: () => "en" }));
import FeedbackPage from "../pages/feedback/FeedbackPage";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const item = {
  id: 1,
  kind: "report",
  category: "app_problem",
  subject: "A problem",
  description: "A detailed report.",
  created_at: "2026-10-06T12:00:00Z",
  channel: "web",
  language: "en",
  location_status: "denied",
  contact_consent: false,
  status: "new",
  useful: null,
};
it("shows anonymous feedback without a reply form and labels voluntary survey totals", async () => {
  get.mockResolvedValue({
    data: {
      items: [item],
      summary: [{ kind: "survey", useful: true, count: 2 }],
      hasMore: false,
    },
  });
  render(<FeedbackPage />);
  fireEvent.click(await screen.findByRole("button", { name: "A problem" }));
  expect(screen.queryByRole("button", { name: "Send reply" })).toBeNull();
  expect(screen.getByText("No contact consent")).toBeTruthy();
  expect(screen.getByText("Location declined")).toBeTruthy();
  expect(screen.getByText(/not unique people/)).toBeTruthy();
});
it("consenting reply explicitly reports Mailpit rather than external delivery", async () => {
  get.mockImplementation((url) =>
    Promise.resolve({
      data: url.endsWith("replies")
        ? { replies: [] }
        : {
            items: [
              { ...item, email: "fixture@example.test", contact_consent: true },
            ],
            summary: [],
            hasMore: false,
          },
    }),
  );
  post.mockResolvedValue({ data: { ok: true, localOnly: true } });
  render(<FeedbackPage />);
  fireEvent.click(await screen.findByRole("button", { name: "A problem" }));
  fireEvent.change(await screen.findByLabelText("Email reply"), {
    target: { value: "Thanks for reporting this." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
  await screen.findByText(
    "Reply saved in local Mailpit. No external email was sent.",
  );
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
  expect(post.mock.calls[0][1].requestId).toMatch(/^[0-9a-f-]{36}$/);
});

it("opens a selected opinion in the side panel and resets reply drafts when switching", async () => {
  const second = {
    ...item,
    id: 2,
    kind: "survey",
    subject: "",
    useful: false,
    description: "Please improve coverage.",
    email: "fixture@example.test",
    contact_consent: true,
    status: "in_progress",
  };
  get.mockResolvedValue({
    data: { items: [item, second], summary: [], hasMore: false },
  });
  render(<FeedbackPage />);
  await screen.findByRole("button", { name: "Your opinion" });
  expect(screen.getByText("Select feedback to view details.")).toBeTruthy();
  for (const name of ["Opinion", "Date", "Status"])
    expect(screen.getByRole("columnheader", { name })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Your opinion" }));
  expect(
    screen.getByRole("region", { name: "Feedback details" }).textContent,
  ).toContain("Please improve coverage.");
  fireEvent.change(screen.getByLabelText("Email reply"), {
    target: { value: "Unsent draft" },
  });
  fireEvent.click(screen.getByRole("button", { name: "A problem" }));
  expect(screen.queryByLabelText("Email reply")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Your opinion" }));
  expect(screen.getByLabelText("Email reply").value).toBe("");
});
it("keeps selected details and updates the row after a status change, then clears selection on filtering", async () => {
  let current = { ...item };
  get.mockImplementation(() =>
    Promise.resolve({
      data: { items: [current], summary: [], hasMore: false },
    }),
  );
  patch.mockImplementation((url, { status }) => {
    current = { ...current, status };
    return Promise.resolve({ data: { ok: true } });
  });
  render(<FeedbackPage />);
  fireEvent.click(await screen.findByRole("button", { name: "A problem" }));
  fireEvent.change(screen.getByLabelText("Status"), {
    target: { value: "resolved" },
  });
  await waitFor(() =>
    expect(screen.getByLabelText("Status").value).toBe("resolved"),
  );
  expect(patch).toHaveBeenCalledWith("/feedback/1", { status: "resolved" });
  expect(screen.getByRole("cell", { name: "Resolved" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Type"), {
    target: { value: "survey" },
  });
  await screen.findByText("Select feedback to view details.");
  expect(screen.queryByLabelText("Status")).toBeNull();
});
