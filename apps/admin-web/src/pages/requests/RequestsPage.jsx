import { useEffect, useState } from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";

import {
  getRequests,
  getRequestById,
  updateRequest,
  addRequestNote,
} from "../../api/requestApi";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Incomplete", value: "incomplete" },
  { label: "Complete", value: "complete" },
  { label: "In Progress", value: "in-progress" },
  { label: "Closed", value: "closed" },
  { label: "Denied", value: "denied" },
];

function getStatusClasses(status) {
  switch (status) {
    case "complete":
      return "bg-green-100 text-green-700";
    case "in-progress":
      return "bg-blue-100 text-blue-700";
    case "denied":
      return "bg-red-100 text-red-700";
    case "closed":
      return "bg-gray-200 text-gray-700";
    case "incomplete":
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [notes, setNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [requestType, setRequestType] = useState("provider");
  const [selectedStatus, setSelectedStatus] = useState("incomplete");
  const [newNote, setNewNote] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadRequests = async (
    currentFilter = filterStatus,
    keepSelectedId = null,
  ) => {
    setListLoading(true);
    setError("");

    try {
      const data = await getRequests(currentFilter, requestType);
      const items = data.requests || [];
      setRequests(items);

      if (items.length === 0) {
        setSelectedRequestId(null);
        setSelectedRequest(null);
        setNotes([]);
        return;
      }

      const targetId =
        items.find((item) => String(item.id) === String(keepSelectedId))?.id ||
        items[0].id;

      setSelectedRequestId(targetId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load requests");
    } finally {
      setListLoading(false);
    }
  };

  const loadRequestDetails = async (requestId) => {
    if (!requestId) return;

    setDetailsLoading(true);
    setError("");

    try {
      const data = await getRequestById(requestId);
      setSelectedRequest(data.request);
      setNotes(data.notes || []);
      setSelectedStatus(data.request.status || "incomplete");
      setNewNote("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load request details");
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests(filterStatus, selectedRequestId);
  }, [filterStatus, requestType]);

  useEffect(() => {
    loadRequestDetails(selectedRequestId);
  }, [selectedRequestId]);

  const filteredRequests = requests.filter((request) => {
    const term = searchTerm.toLowerCase();
    return (
      (request.display_name || "").toLowerCase().includes(term) ||
      (request.title || "").toLowerCase().includes(term)
    );
  });

  const handleUpdate = async () => {
    if (!selectedRequestId) return;

    setUpdateLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await updateRequest(selectedRequestId, { status: selectedStatus });

      if (newNote.trim()) {
        await addRequestNote(selectedRequestId, newNote);
      }

      await loadRequests(filterStatus, selectedRequestId);
      await loadRequestDetails(selectedRequestId);

      setSuccessMessage("Request updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update request");
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <DashboardLayout title="Requests">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:h-[calc(100vh-12rem)]">
        {/* LEFT COLUMN */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col min-h-0">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Requests</h3>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Search by provider or title"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="provider">Provider Requests</option>
              <option value="public">Public Messages</option>
              <option value="all">All Requests</option>
            </select>
          </div>

          <div className="flex-1 min-h-0">
            {listLoading ? (
              <p className="text-sm text-gray-500">Loading requests...</p>
            ) : filteredRequests.length === 0 ? (
              <p className="text-sm text-gray-500">No requests found.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="h-full overflow-y-auto rounded-xl border">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-blue-700 text-white">
                      <tr className="text-left">
                        <th className="py-3 pr-4 pl-3 font-semibold">
                          Requester
                        </th>
                        <th className="py-3 pr-4 font-semibold">Title</th>
                        <th className="py-3 pr-4 font-semibold">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRequests.map((request) => {
                        const isSelected =
                          String(selectedRequestId) === String(request.id);

                        return (
                          <tr
                            key={request.id}
                            onClick={() => setSelectedRequestId(request.id)}
                            className={`border-b last:border-b-0 cursor-pointer ${
                              isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                            }`}
                          >
                            <td className="py-4 pr-4 pl-3 font-medium text-gray-800">
                              {request.display_name || "Unknown requester"}
                            </td>

                            <td className="py-4 pr-4 text-gray-600">
                              {request.title}
                            </td>

                            <td className="py-4 pr-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                                  request.status,
                                )}`}
                              >
                                {request.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col min-h-0">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Request Details
            </h3>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {detailsLoading ? (
              <p className="text-sm text-gray-500">
                Loading request details...
              </p>
            ) : !selectedRequest ? (
              <p className="text-sm text-gray-500">
                Select a request to view details.
              </p>
            ) : (
              <div className="space-y-4 pr-1">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Title
                  </p>
                  <p className="text-sm text-gray-800 mt-1">
                    {selectedRequest.title}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Requester
                  </p>
                  <p className="text-sm text-gray-800 mt-1">
                    {selectedRequest.display_name || "Unknown provider"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Status
                  </p>
                  <div className="mt-1">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                        selectedRequest.status,
                      )}`}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Description
                  </p>
                  <p className="text-sm text-gray-800 mt-1">
                    {selectedRequest.description}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
                    Conversation
                  </p>

                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-500">No notes yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-xl border border-gray-200 p-3"
                        >
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            {note.user_type === "admin"
                              ? "Admin"
                              : note.user_type === "public"
                                ? "Public User"
                                : "Provider"}{" "}
                            — {new Date(note.created_at).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-800">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
                    Action
                  </p>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="incomplete">Incomplete</option>
                    <option value="complete">Complete</option>
                    <option value="in-progress">In Progress</option>
                    <option value="closed">Closed</option>
                    <option value="denied">Denied</option>
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
                    Add Note
                  </p>

                  <textarea
                    rows={4}
                    placeholder="Add a new conversation note"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={updateLoading}
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-green-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-green-600 disabled:opacity-70"
                >
                  {updateLoading ? "Updating..." : "Update"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
