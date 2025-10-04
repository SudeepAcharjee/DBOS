import React, { useEffect, useMemo, useState } from "react";
import { databases, storage } from "../appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;

const columns = [
  { key: "formNumber", title: "Application Number" },
  { key: "studentName", title: "Name" },
  { key: "email", title: "Email" },
  { key: "mobile", title: "Phone Number" },
  { key: "action", title: "Action" },
];

const Admin = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await databases.listDocuments(databaseId, collectionId, []);
        const mapped = res.documents.map((d, idx) => {
          let avatarUrl = "";
          if (d.photoFileId) {
            try {
              avatarUrl = storage.getFilePreview(bucketId, d.photoFileId).href;
            } catch (_) {
              avatarUrl = "";
            }
          } else if (d.photoUrl) {
            avatarUrl = d.photoUrl;
          }

          return {
            id: d.$id,
            createdAt: d.$createdAt,
            formNumber: String(idx + 1).padStart(2, "0"),
            studyCenter: d.studyCenter || "",
            studentName: d.studentName || "",
            mobile: d.mobile || "",
            email: d.email || "",
            subjects: [
              d.subject_1,
              d.subject_2,
              d.subject_3,
              d.subject_4,
              d.subject_5,
              d.subject_6,
            ]
              .filter(Boolean)
              .join(", "),
            avatar: avatarUrl,
            documents: Array.isArray(d.documents) ? d.documents : [],
            status: d.status || "Not Approved",
          };
        });
        setRows(mapped);
      } catch (e) {
        setError(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = rows;
    if (term) {
      data = rows.filter((r) =>
        [r.studentName, r.email, r.mobile, r.studyCenter]
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }
    const sorted = [...data].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "createdAt")
        return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
      if (sortBy === "studentName")
        return a.studentName.localeCompare(b.studentName) * dir;
      if (sortBy === "studyCenter")
        return a.studyCenter.localeCompare(b.studyCenter) * dir;
      return 0;
    });
    return sorted;
  }, [rows, search, sortBy, sortDir]);

  return (
    <div className="max-w-7xl mx-auto my-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-blue-900">Student Data</h1>
        <div className="flex items-center gap-3">
          <input
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Search by name, center, phone, email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Sort by Created</option>
            <option value="studentName">Sort by Name</option>
            <option value="studyCenter">Sort by Center</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>
      </div>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      {loading ? (
        <div className="p-6 border border-gray-200 rounded-md bg-white">
          Loading...
        </div>
      ) : (
        <div className="overflow-auto border border-gray-200 rounded-md bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="text-left font-semibold px-4 py-2 border-b"
                  >
                    {c.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3 border-b">{r.formNumber}</td>
                  <td className="px-4 py-3 border-b">{r.studentName}</td>
                  <td className="px-4 py-3 border-b">{r.email}</td>
                  <td className="px-4 py-3 border-b">{r.mobile}</td>
                  <td className="px-4 py-3 border-b">
                    <button
                      onClick={() =>
                        (window.location.href = `/student/${r.id}`)
                      }
                      className="px-3 py-1 bg-blue-900 text-white rounded-md hover:bg-blue-800 text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Admin;
