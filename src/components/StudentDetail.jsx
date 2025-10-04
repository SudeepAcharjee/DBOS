import React, { useEffect, useState } from "react";
import { databases, storage } from "../appwrite";
import { Query } from "appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const uploadsCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_UPLOADS;
const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;

const StudentDetail = ({ studentId }) => {
  const [student, setStudent] = useState(null);
  const [uploads, setUploads] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        setLoading(true);
        setError("");

        // Load main student data
        const studentDoc = await databases.getDocument(
          databaseId,
          collectionId,
          studentId
        );

        // Load uploads data filtered by studentId
        let uploadsData = null;
        let photoUrl = "";

        try {
          const uploadsList = await databases.listDocuments(
            databaseId,
            uploadsCollectionId,
            [Query.equal("studentId", studentId)]
          );
          if (uploadsList.documents.length > 0) {
            uploadsData = uploadsList.documents[0];
            console.log("Uploads data structure:", uploadsData); // Debug log

            // Get photo URL from uploads collection
            if (uploadsData.photoFileId) {
              try {
                const photoRes = storage.getFilePreview(
                  bucketId,
                  uploadsData.photoFileId
                );
                photoUrl =
                  typeof photoRes === "string" ? photoRes : photoRes?.href;
              } catch (err) {
                console.log("Failed to generate photo URL:", err.message);
              }
            }
          }
        } catch (err) {
          console.log("No uploads data found for student:", err.message);
        }

        setStudent({
          ...studentDoc,
          photoUrl,
        });
        setUploads(uploadsData);
      } catch (err) {
        setError(err?.message || "Failed to load student data");
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      loadStudentData();
    }
  }, [studentId]);

  const goBack = () => {
    window.location.href = "/admin";
  };

  const downloadDocument = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename || `document_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document. Please try again.");
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...student });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleInputChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Remove photoUrl and other uploads-related fields from editData before saving
      const { photoUrl, ...dataToSave } = editData;

      // Update the student document in the database
      await databases.updateDocument(
        databaseId,
        collectionId,
        studentId,
        dataToSave
      );

      // Update local state (keep photoUrl from original student data)
      setStudent({
        ...editData,
        photoUrl: student.photoUrl, // Keep original photoUrl
      });
      setIsEditing(false);
      setEditData({});

      alert("Student information updated successfully!");
    } catch (error) {
      console.error("Error updating student:", error);
      alert("Failed to update student information. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (label, field, value, type = "text") => {
    if (isEditing) {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          <input
            type={type}
            value={editData[field] || ""}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <p className="mt-1 text-sm text-gray-900">{value || "—"}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto my-6 p-6">
        <div className="text-center">Loading student data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto my-6 p-6">
        <div className="text-center text-red-600">{error}</div>
        <button
          onClick={goBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Admin
        </button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto my-6 p-6">
        <div className="text-center">Student not found</div>
        <button
          onClick={goBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Admin
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-900">Student Details</h1>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800"
            >
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-900 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
            </>
          )}
          <button
            onClick={goBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Back to Admin
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        {/* Photo - Read Only */}
        {student.photoUrl && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Passport Photo
            </h2>
            <div className="flex justify-center">
              <img
                src={student.photoUrl}
                alt="Student Photo"
                className="w-32 h-32 object-cover rounded-lg border border-gray-300"
              />
            </div>
            {isEditing && (
              <p className="text-sm text-gray-500 text-center mt-2">
                Photo cannot be edited through this form
              </p>
            )}
          </div>
        )}

        {/* Personal Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Student Name", "studentName", student.studentName)}
            {renderField("Father's Name", "fatherName", student.fatherName)}
            {renderField("Mother's Name", "motherName", student.motherName)}
            {isEditing ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date of Birth (DOB)
                </label>
                <input
                  type="date"
                  value={editData.dob ? editData.dob.split("T")[0] : ""}
                  onChange={(e) => handleInputChange("dob", e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date of Birth (DOB)
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {student.dob
                    ? new Date(student.dob).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            )}
            {renderField("Gender", "gender", student.gender)}
            {renderField("Mobile Number", "mobile", student.mobile, "tel")}
            {renderField("Email", "email", student.email, "email")}
            {renderField("Caste", "caste", student.caste)}
            {renderField("Religion", "religion", student.religion)}
            {renderField("Nationality", "nationality", student.nationality)}
            {renderField(
              "Marital Status",
              "maritalStatus",
              student.maritalStatus
            )}
            {renderField("Aadhaar Number", "aadhaar", student.aadhaar)}
            {isEditing ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Present Address
                </label>
                <textarea
                  value={editData.presentAddress || ""}
                  onChange={(e) =>
                    handleInputChange("presentAddress", e.target.value)
                  }
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Present Address
                </label>
                <div className="mt-1 text-sm text-gray-900">
                  {student.presentAddress ? (
                    Array.isArray(student.presentAddress) ? (
                      <ul className="list-disc list-inside space-y-1">
                        {student.presentAddress.map((addr, index) => (
                          <li key={index}>{addr}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{student.presentAddress}</p>
                    )
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            )}
            {renderField("Present PIN Code", "presentPin", student.presentPin)}
            {isEditing ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Permanent Address
                </label>
                <textarea
                  value={editData.permanentAddress || ""}
                  onChange={(e) =>
                    handleInputChange("permanentAddress", e.target.value)
                  }
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Permanent Address
                </label>
                <div className="mt-1 text-sm text-gray-900">
                  {student.permanentAddress ? (
                    Array.isArray(student.permanentAddress) ? (
                      <ul className="list-disc list-inside space-y-1">
                        {student.permanentAddress.map((addr, index) => (
                          <li key={index}>{addr}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{student.permanentAddress}</p>
                    )
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            )}
            {renderField(
              "Permanent PIN Code",
              "permanentPin",
              student.permanentPin
            )}
          </div>
        </div>

        {/* Academic Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Academic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField("Stream", "stream", student.stream)}
            {renderField("Exam Name", "examName", student.examName)}
            {renderField("Board", "board", student.board)}
            {renderField("Roll Number", "rollNumber", student.rollNumber)}
            {renderField("Marks", "marks", student.marks)}
            {renderField(
              "Year of Passing",
              "yearOfPassing",
              student.yearOfPassing
            )}
            {renderField("Percentage", "percentage", student.percentage)}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Subjects
              </label>
              {isEditing ? (
                <div className="mt-1 space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <input
                      key={num}
                      type="text"
                      placeholder={`Subject ${num}`}
                      value={editData[`subject_${num}`] || ""}
                      onChange={(e) =>
                        handleInputChange(`subject_${num}`, e.target.value)
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap gap-2">
                  {[
                    student.subject_1,
                    student.subject_2,
                    student.subject_3,
                    student.subject_4,
                    student.subject_5,
                    student.subject_6,
                  ]
                    .filter(Boolean)
                    .map((subject, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                      >
                        {subject}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Documents - Read Only */}
        {uploads && uploads.documents && uploads.documents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Uploaded Documents
              </h2>
              <button
                onClick={() => {
                  uploads.documents.forEach((doc, index) => {
                    setTimeout(() => {
                      downloadDocument(doc, `document_${index + 1}.pdf`);
                    }, index * 1000); // Stagger downloads by 1 second
                  });
                }}
                className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 text-sm"
              >
                Download All Documents
              </button>
            </div>
            {isEditing && (
              <p className="text-sm text-gray-500 mb-4">
                Documents cannot be edited through this form
              </p>
            )}
            <div className="space-y-2">
              {(() => {
                // Define the expected document names in order
                const expectedDocuments = [
                  "Signature",
                  "Aadhar Card",
                  "Birth Certificate",
                  "Class VII or IX Pass Certificate",
                  "Class VII or IX Marksheet",
                  "10th Marksheet",
                  "10th Pass Certificate",
                  "10th Admit Card",
                ];

                // Create a mapping of documents with their proper names
                const documentMapping = uploads.documents.map((doc, index) => {
                  // Try to extract meaningful name from URL
                  const urlParts = doc.split("/");
                  const fileName = urlParts[urlParts.length - 1];
                  const lowerFileName = fileName.toLowerCase();

                  // Check if it contains common document type keywords
                  let documentName = `Document ${index + 1}`; // Default fallback

                  if (lowerFileName.includes("signature")) {
                    documentName = "Signature";
                  } else if (
                    lowerFileName.includes("aadhaar") ||
                    lowerFileName.includes("aadhar")
                  ) {
                    documentName = "Aadhar Card";
                  } else if (lowerFileName.includes("birth")) {
                    documentName = "Birth Certificate";
                  } else if (
                    lowerFileName.includes("class") &&
                    (lowerFileName.includes("7") || lowerFileName.includes("9"))
                  ) {
                    if (lowerFileName.includes("pass")) {
                      documentName = "Class VII or IX Pass Certificate";
                    } else if (lowerFileName.includes("mark")) {
                      documentName = "Class VII or IX Marksheet";
                    }
                  } else if (
                    lowerFileName.includes("10th") ||
                    lowerFileName.includes("tenth")
                  ) {
                    if (lowerFileName.includes("mark")) {
                      documentName = "10th Marksheet";
                    } else if (lowerFileName.includes("pass")) {
                      documentName = "10th Pass Certificate";
                    } else if (
                      lowerFileName.includes("admin") ||
                      lowerFileName.includes("admit")
                    ) {
                      documentName = "10th Admit Card";
                    }
                  }

                  return {
                    url: doc,
                    name: documentName,
                    originalIndex: index,
                  };
                });

                // Sort documents by their expected order
                const sortedDocuments = documentMapping.sort((a, b) => {
                  const indexA = expectedDocuments.indexOf(a.name);
                  const indexB = expectedDocuments.indexOf(b.name);

                  // If both documents are in the expected list, sort by their position
                  if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                  }

                  // If only one is in the expected list, prioritize it
                  if (indexA !== -1) return -1;
                  if (indexB !== -1) return 1;

                  // If neither is in the expected list, maintain original order
                  return a.originalIndex - b.originalIndex;
                });

                return sortedDocuments.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {doc.name}
                    </span>
                    <div className="flex gap-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-blue-900 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        View Document
                      </a>
                      <button
                        onClick={() =>
                          downloadDocument(
                            doc.url,
                            `${doc.name.replace(/\s+/g, "_")}.pdf`
                          )
                        }
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Application Status */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Application Status
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm">
              {student.status || "Not Approved"}
            </span>
            <button className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
              Approve Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
