import React, { useState } from "react";
import { databases, storage } from "../appwrite";
import { ID, Query } from "appwrite";

const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID; // keep env key consistent
const collectionUploadsId = import.meta.env.VITE_APPWRITE_COLLECTION_UPLOADS;

const DocumentRow = ({ index, doc, onChange, onUploaded, studentId }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    onChange(index, { ...doc, file });
  };

  const handleUpload = async () => {
    if (!doc.file || doc.uploaded) return;

    if (!studentId) {
      alert(
        "Student ID is required for upload. Please ensure the form is submitted first."
      );
      return;
    }

    setUploading(true);
    try {
      const created = await storage.createFile(bucketId, ID.unique(), doc.file);
      const viewRes = storage.getFileView(bucketId, created.$id);
      const viewUrl = typeof viewRes === "string" ? viewRes : viewRes?.href;

      if (!viewUrl) {
        throw new Error("Failed to generate file URL");
      }

      onUploaded(index, created.$id, viewUrl, studentId);
    } catch (err) {
      alert(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-white space-y-3">
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2">
          <input
            type="file"
            onChange={handleFileChange}
            disabled={uploading || doc.uploaded}
          />
          <svg
            className="w-4 h-4 text-gray-600"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M4 3a2 2 0 00-2 2v5a5 5 0 0010 0V6a1 1 0 10-2 0v4a3 3 0 11-6 0V5a1 1 0 011-1h5a1 1 0 100-2H4z" />
            <path d="M15 7a1 1 0 011 1v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2h-2a1 1 0 110-2h2V8a1 1 0 011-1z" />
          </svg>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!doc.file || uploading || doc.uploaded}
            className="px-3 py-1.5 text-sm rounded-md bg-blue-900 text-white disabled:opacity-60"
          >
            {doc.uploaded ? "Uploaded" : uploading ? "Uploading..." : "Upload"}
          </button>
          {doc.viewUrl && (
            <a
              href={doc.viewUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
            >
              View
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const Uploads = ({ studentId }) => {
  const [message, setMessage] = useState("");
  const [docs, setDocs] = useState([]);
  const [selectedType, setSelectedType] = useState("");

  // Debug: Log studentId when component mounts
  console.log("Uploads component received studentId:", studentId);

  // List of important documents that need to be uploaded
  const requiredDocuments = [
    { id: "aadhaar_card", name: "Aadhaar Card", required: true },
    { id: "birth_certificate", name: "Birth Certificate", required: true },
    {
      id: "class_7_9_pass_certificate",
      name: "Class VII or IX Pass Certificate",
      required: true,
    },
    {
      id: "class_7_9_marksheet",
      name: "Class VII or IX Marksheet",
      required: true,
    },
    { id: "marksheet_10th", name: "10th Marksheet", required: true },
    {
      id: "pass_certificate_10th",
      name: "10th Pass Certificate",
      required: true,
    },
    { id: "admin_card_10th", name: "10th Admin Card", required: true },
  ];

  const handleChange = (idx, next) => {
    setDocs((prev) => prev.map((d, i) => (i === idx ? next : d)));
  };

  const handleUploaded = async (idx, fileId, viewUrl, studentIdParam) => {
    // Use the studentId from props (real studentId from admissionform)
    const currentStudentId = studentId;

    console.log("handleUploaded called with:", {
      idx,
      fileId,
      viewUrl,
      studentIdParam,
      currentStudentId,
    });

    // Validate required parameters before proceeding
    if (!viewUrl || typeof viewUrl !== "string") {
      console.error("Invalid viewUrl:", viewUrl);
      alert("Failed to generate file URL. Please try again.");
      return;
    }

    if (!currentStudentId) {
      console.error("StudentId is required but not provided");
      alert(
        "Student ID is required for upload. Please ensure the form is submitted first."
      );
      return;
    }

    setDocs((prev) =>
      prev.map((d, i) =>
        i === idx ? { ...d, uploaded: true, fileId, viewUrl } : d
      )
    );

    try {
      // Store locally for main form submission
      const arr = JSON.parse(localStorage.getItem("uploadedDocuments") || "[]");
      const next = Array.isArray(arr) ? arr : [];
      if (!next.find((x) => x.fileId === fileId))
        next.push({ fileId, url: viewUrl, title: docs[idx].title });
      localStorage.setItem("uploadedDocuments", JSON.stringify(next));

      // Update or create the student's uploads record
      const uploadsCollectionId = import.meta.env
        .VITE_APPWRITE_COLLECTION_UPLOADS;

      // Check if student already has an uploads record
      const existingDocs = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        uploadsCollectionId,
        [Query.equal("studentId", currentStudentId)]
      );

      if (existingDocs.documents.length > 0) {
        // Update existing record - add new document to the array
        const existingDoc = existingDocs.documents[0];
        const currentDocuments = existingDoc.documents || [];
        const newDocuments = [...currentDocuments, viewUrl];

        console.log("Updating existing record with new document:", viewUrl);
        await databases.updateDocument(
          import.meta.env.VITE_APPWRITE_DATABASE_ID,
          uploadsCollectionId,
          existingDoc.$id,
          {
            documents: newDocuments,
          }
        );
      } else {
        // Create new record for this student
        console.log("Creating new record for student:", currentStudentId);
        await databases.createDocument(
          import.meta.env.VITE_APPWRITE_DATABASE_ID,
          uploadsCollectionId,
          ID.unique(),
          {
            studentId: currentStudentId,
            documents: [viewUrl],
          }
        );
      }
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to save document reference");
    }
  };

  // Check if a specific document type is uploaded
  const isDocumentUploaded = (documentType) => {
    return docs.some(
      (doc) =>
        doc.uploaded &&
        doc.title &&
        doc.title.toLowerCase().includes(documentType.toLowerCase())
    );
  };

  const addDoc = () =>
    setDocs((prev) => [
      ...prev,
      { title: "", file: null, uploaded: false, fileId: "", viewUrl: "" },
    ]);

  const ensureDocForType = (typeName) => {
    setDocs((prev) => {
      const existsIndex = prev.findIndex(
        (d) => (d.title || "").toLowerCase() === typeName.toLowerCase()
      );
      if (existsIndex !== -1) return prev;
      return [
        ...prev,
        {
          title: typeName,
          file: null,
          uploaded: false,
          fileId: "",
          viewUrl: "",
        },
      ];
    });
  };

  const saveSummary = async () => {
    try {
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
      const collectionId = import.meta.env.VITE_APPWRITE_COLLECTION_UPLOADS;
      const payload = docs.map(({ title, fileId, viewUrl }) => ({
        title,
        fileId,
        viewUrl,
      }));
      await databases.createDocument(dbId, collectionId, ID.unique(), {
        documents: payload,
      });
      setMessage("Saved upload references.");
    } catch (err) {
      setMessage(err?.message || "Failed to save references");
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6 space-y-4">
      <div className="p-4 rounded-md bg-yellow-50 border border-yellow-300">
        <div className="font-bold text-yellow-900">Note:-</div>
        <ul className="list-disc ml-6 text-sm text-yellow-900">
          <li>Please rename your uploaded files properly before upload.</li>
          <li>JPG | PNG | JPEG max size: 200kb; PDF max size: 300kb.</li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold text-blue-900">Uploads</h2>

      {/* Required Documents Checklist */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Required Documents Checklist
          </h3>
          <div className="text-sm text-gray-600">
            {
              requiredDocuments.filter((doc) => isDocumentUploaded(doc.name))
                .length
            }{" "}
            / {requiredDocuments.length} uploaded
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${
                (requiredDocuments.filter((doc) => isDocumentUploaded(doc.name))
                  .length /
                  requiredDocuments.length) *
                100
              }%`,
            }}
          ></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requiredDocuments.map((doc) => {
            const isUploaded = isDocumentUploaded(doc.name);
            return (
              <div
                key={doc.id}
                className={`flex items-center gap-2 p-2 rounded-md border ${
                  isUploaded
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    isUploaded ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  {isUploaded && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isUploaded ? "text-green-800" : "text-gray-700"
                  }`}
                >
                  {doc.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Select document type to upload */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Document Type to Upload
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          value={selectedType}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedType(val);
            if (val) ensureDocForType(val);
          }}
        >
          <option value="">Select a document</option>
          {requiredDocuments.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>

        {selectedType && (
          <div className="mt-4">
            {docs
              .map((doc, idx) => ({ doc, idx }))
              .filter(({ doc }) => (doc.title || "") === selectedType)
              .map(({ doc, idx }) => (
                <DocumentRow
                  key={`${doc.title}-${idx}`}
                  index={idx}
                  doc={doc}
                  onChange={handleChange}
                  onUploaded={(i, fileId, viewUrl, sid) =>
                    handleUploaded(i, fileId, viewUrl, sid)
                  }
                  studentId={studentId}
                />
              ))}
          </div>
        )}
      </div>

      {/* Submit button with confirmation; replaces external control */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            const confirmed = window.confirm(
              "Are you sure you want to submit and reset the form?"
            );
            if (confirmed) {
              try {
                localStorage.removeItem("uploadedDocuments");
              } catch (_) {}
              setDocs([]);
              setSelectedType("");
              setMessage("Submission completed and form reset.");
              // Redirect to Admission Form (home) to start a new application
              window.location.href = "/";
            }
          }}
          className="px-4 py-2 rounded-md bg-blue-900 text-white"
        >
          Submit
        </button>
        {message && <span className="text-sm text-gray-700">{message}</span>}
      </div>
    </div>
  );
};

export default Uploads;
