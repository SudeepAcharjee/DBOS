import React, { useState } from "react";
import { databases, storage } from "../appwrite";
import { ID } from "appwrite";

const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID; // keep env key consistent
const collectionUploadsId = import.meta.env.VITE_APPWRITE_COLLECTION_UPLOADS;

const DocumentRow = ({
  index,
  doc,
  onChange,
  onRemove,
  onUploaded,
  studentId,
}) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    onChange(index, { ...doc, file });
  };

  const handleTitleChange = (e) => {
    onChange(index, { ...doc, title: e.target.value });
  };

  const handleUpload = async () => {
    if (!doc.file || doc.uploaded) return;
    setUploading(true);
    try {
      const created = await storage.createFile(bucketId, ID.unique(), doc.file);
      const viewRes = storage.getFileView(bucketId, created.$id);
      const viewUrl = typeof viewRes === "string" ? viewRes : viewRes?.href;

      if (!viewUrl) {
        throw new Error("Failed to generate file URL");
      }

      onUploaded(index, created.$id, viewUrl);
    } catch (err) {
      alert(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-white space-y-3">
      <div className="flex flex-col gap-3">
        <input
          type="file"
          onChange={handleFileChange}
          disabled={uploading || doc.uploaded}
        />
        <input
          type="text"
          placeholder="Document Title (e.g., Signature, Aadhaar Card, Birth Certificate, etc.)"
          value={doc.title}
          onChange={handleTitleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
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
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-600 text-sm"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

const Uploads = ({ studentId }) => {
  const [message, setMessage] = useState("");
  const [docs, setDocs] = useState([
    { title: "", file: null, uploaded: false, fileId: "", viewUrl: "" },
  ]);

  // List of important documents that need to be uploaded
  const requiredDocuments = [
    { id: "signature", name: "Signature", required: true },
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

  const handleRemove = (idx) => {
    setDocs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploaded = async (idx, fileId, viewUrl, studentId) => {
    console.log("handleUploaded called with:", { idx, fileId, viewUrl });

    // Validate viewUrl before proceeding
    if (!viewUrl || typeof viewUrl !== "string") {
      console.error("Invalid viewUrl:", viewUrl);
      alert("Failed to generate file URL. Please try again.");
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

      // Also save to uploads collection documents array
      const uploadsCollectionId = import.meta.env
        .VITE_APPWRITE_COLLECTION_UPLOADS;

      // Get existing uploads collection documents
      const existingDocs = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        uploadsCollectionId,
        []
      );

      if (existingDocs.documents.length > 0) {
        // Update existing document with new document URL
        const existingDoc = existingDocs.documents[0];
        const currentDocuments = existingDoc.documents || [];
        // Filter out any null/undefined values before adding new URL
        const filteredDocuments = currentDocuments.filter(
          (doc) => doc && typeof doc === "string"
        );
        const newDocuments = [...filteredDocuments, viewUrl];

        console.log("Updating documents array with:", newDocuments);

        await databases.updateDocument(
          import.meta.env.VITE_APPWRITE_DATABASE_ID,
          uploadsCollectionId,
          existingDoc.$id,
          {
            studentId,
            documents: newDocuments,
          }
        );
      } else {
        // Create new document if none exists
        console.log("Creating new document with URL:", viewUrl);
        await databases.createDocument(
          import.meta.env.VITE_APPWRITE_DATABASE_ID,
          uploadsCollectionId,
          ID.unique(),
          {
            studentId,
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
                {doc.required && (
                  <span className="text-xs text-red-600 font-medium">
                    *Required
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-gray-600">
          <span className="text-red-600">*</span> Required documents must be
          uploaded
        </div>
      </div>

      <div className="space-y-3">
        {docs.map((doc, idx) => (
          <DocumentRow
            key={idx}
            index={idx}
            doc={doc}
            onChange={handleChange}
            onRemove={handleRemove}
            onUploaded={(idx, fileId, viewUrl) =>
              handleUploaded(idx, fileId, viewUrl, studentId)
            }
            studentId={studentId}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={addDoc}
          className="px-4 py-2 rounded-md bg-blue-900 text-white"
        >
          Add Another Document
        </button>
        {message && <span className="text-sm text-gray-700">{message}</span>}
      </div>
    </div>
  );
};

export default Uploads;
