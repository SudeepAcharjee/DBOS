import React, { useEffect, useMemo, useState } from "react";
import { account, databases, storage } from "../appwrite";
import AdminLogin from "./AdminLogin";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  // Check if user is already logged in with Appwrite
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await account.get();
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log("User not authenticated:", error.message);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Load actual student data from Appwrite
  useEffect(() => {
    if (isAuthenticated) {
      loadStudentData();
    }
  }, [isAuthenticated]);

  const loadStudentData = async () => {
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
          studentName: d.studentName || "",
          mobile: d.mobile || "",
          email: d.email || "",
          fatherName: d.fatherName || "",
          motherName: d.motherName || "",
          dob: d.dob || "",
          gender: d.gender || "",
          nationality: d.nationality || "",
          caste: d.caste || "",
          religion: d.religion || "",
          maritalStatus: d.maritalStatus || "",
          stream: d.stream || "",
          admissionfor: d.admissionfor || "",
          langSubject: d.langSubject || [],
          nonLangSubject: d["non-langSubject"] || [],
          addSubject: d.addSubject || [],
          permanentAddress: d.permanentAddress || "",
          permanentPin: d.permanentPin || "",
          aadhaar: d.aadhaar || "",
          presentAddress: d.presentAddress || "",
          presentPin: d.presentPin || "",
          examName: d.examName || "",
          board: d.board || "",
          yearOfPassing: d.yearOfPassing || "",
          rollNumber: d.rollNumber || "",
          marks: d.marks || "",
          percentage: d.percentage || "",
          session: d.session || "",
          medium: d.medium || "",
          mode: d.mode || "",
          avatar: avatarUrl,
          status: d.status || "Pending",
        };
      });
      setRows(mapped);
    } catch (e) {
      console.error("Error loading student data:", e);
      setError(e?.message || "Failed to load student data");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = rows;
    if (term) {
      data = rows.filter((r) =>
        [
          r.studentName,
          r.email,
          r.mobile,
          r.fatherName,
          r.motherName,
          r.aadhaar,
          r.rollNumber,
          r.formNumber,
        ]
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
      return 0;
    });
    return sorted;
  }, [rows, search, sortBy, sortDir]);

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  // Show admin dashboard if authenticated
  return (
    <div className="max-w-7xl mx-auto my-6">
      {/* Header with user info and logout */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/DBOS-logo-300x300.png"
              alt="DBOS Logo"
              className="h-12 w-12 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-blue-900">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Dihing Board of Open Schooling
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                Welcome, {user?.name || user?.email || "Admin"}
              </p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Student Applications
        </h2>
        <div className="flex items-center gap-3">
          <input
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Search by name, phone, email, Aadhaar, roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={loadStudentData}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Sort by Created</option>
            <option value="studentName">Sort by Name</option>
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
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading student data...</span>
          </div>
        </div>
      ) : (
        <div className="overflow-auto border border-gray-200 rounded-md bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left font-semibold px-4 py-2 border-b">
                  App No.
                </th>
                <th className="text-left font-semibold px-4 py-2 border-b">
                  Student Name
                </th>
                <th className="text-left font-semibold px-4 py-2 border-b">
                  Email
                </th>
                <th className="text-left font-semibold px-4 py-2 border-b">
                  Phone
                </th>
                <th className="text-left font-semibold px-4 py-2 border-b">
                  Admission For
                </th>
                <th className="text-left font-semibold px-4 py-2 border-b">
                  Status
                </th>
                <th className="text-left font-semibold px-4 py-2 border-b">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="align-top hover:bg-gray-50">
                  <td className="px-4 py-3 border-b font-mono text-xs">
                    {r.formNumber}
                  </td>
                  <td className="px-4 py-3 border-b">
                    <div>
                      <div className="font-medium">{r.studentName}</div>
                      <div className="text-xs text-gray-500">
                        {r.fatherName && `S/O ${r.fatherName}`}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b text-xs">{r.email}</td>
                  <td className="px-4 py-3 border-b text-xs">{r.mobile}</td>
                  <td className="px-4 py-3 border-b text-xs">
                    {r.admissionfor || "N/A"}
                  </td>
                  <td className="px-4 py-3 border-b">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        r.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : r.status === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b">
                    <button
                      onClick={() =>
                        (window.location.href = `/student/${r.id}`)
                      }
                      className="px-3 py-1 bg-blue-900 text-white rounded-md hover:bg-blue-800 text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    {rows.length === 0
                      ? "No student applications found"
                      : "No records match your search criteria"}
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
