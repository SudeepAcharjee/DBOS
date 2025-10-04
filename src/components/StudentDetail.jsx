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
            // Get the single uploads record for this student
            const uploadsDoc = uploadsList.documents[0];
            console.log("Uploads data structure:", uploadsDoc); // Debug log

            // Get photo URL from uploads collection
            if (uploadsDoc.photoFileId) {
              try {
                const photoRes = storage.getFilePreview(
                  bucketId,
                  uploadsDoc.photoFileId
                );
                photoUrl =
                  typeof photoRes === "string" ? photoRes : photoRes?.href;
              } catch (err) {
                console.log("Failed to generate photo URL:", err.message);
              }
            }

            // Create uploads data object
            uploadsData = {
              documents: uploadsDoc.documents || [],
              studentId: studentId,
            };
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
            {renderField("Admission For", "admissionfor", student.admissionfor)}
            {renderField("Stream", "stream", student.stream)}
            {renderField("Session", "session", student.session)}
            {renderField("Medium", "medium", student.medium)}
            {renderField("Mode", "mode", student.mode)}
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
          </div>

          {/* Selected Subjects */}
          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-700 mb-4">
              Selected Subjects
            </h3>

            {/* Language Subjects */}
            {student.langSubject && student.langSubject.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  Language Subjects ({student.langSubject.length}/2)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {student.langSubject.map((subject, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Non-Language Subjects */}
            {student["non-langSubject"] &&
              student["non-langSubject"].length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">
                    Non-Language Subjects ({student["non-langSubject"].length}
                    /3)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {student["non-langSubject"].map((subject, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Additional Subjects */}
            {student.addSubject && student.addSubject.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  Additional Subjects ({student.addSubject.length}/1)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {student.addSubject.map((subject, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Show message if no subjects selected */}
            {(!student.langSubject || student.langSubject.length === 0) &&
              (!student["non-langSubject"] ||
                student["non-langSubject"].length === 0) &&
              (!student.addSubject || student.addSubject.length === 0) && (
                <div className="text-sm text-gray-500 italic">
                  No subjects selected
                </div>
              )}
          </div>
        </div>

        {/* Documents - Read Only */}
        {/* Uploaded Documents */}
        {uploads && uploads.documents && uploads.documents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Uploaded Documents
              </h2>
              <button
                onClick={() => {
                  uploads.documents.forEach((docUrl, index) => {
                    setTimeout(() => {
                      downloadDocument(docUrl, `document_${index + 1}.pdf`);
                    }, index * 1000);
                  });
                }}
                className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 text-sm"
              >
                Download All Documents
              </button>
            </div>
            <div className="space-y-2">
              {uploads.documents.map((docUrl, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                >
                  <span className="text-sm font-medium text-gray-700">
                    Document {index + 1}
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-blue-900 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      View Document
                    </a>
                    <button
                      onClick={() =>
                        downloadDocument(docUrl, `document_${index + 1}.pdf`)
                      }
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
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
