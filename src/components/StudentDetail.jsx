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
        let signatureUrl = "";

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

            // Get signature URL from uploads collection
            if (uploadsDoc.signatureFileId) {
              try {
                const signatureRes = storage.getFilePreview(
                  bucketId,
                  uploadsDoc.signatureFileId
                );
                signatureUrl =
                  typeof signatureRes === "string"
                    ? signatureRes
                    : signatureRes?.href;
              } catch (err) {
                console.log("Failed to generate signature URL:", err.message);
              }
            }

            // Create uploads data object
            uploadsData = {
              documents: uploadsDoc.documents || [],
              signatureUrl: signatureUrl,
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
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          type={type}
          value={editData[field] || value || ""}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-gray-800 print:border-2"
          readOnly={!isEditing}
        />
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

  const handlePrint = () => {
    const style = document.createElement("style");
    style.media = "print";
    style.innerHTML = `
      @page { size: A4 portrait; margin: 8mm; }
      /* Keep Present Address block together on one page */
      .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
    `;
    document.head.appendChild(style);
    const cleanup = () => {
      try {
        document.head.removeChild(style);
      } catch (_) {}
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col items-center gap-3 py-6">
        <img
          src="/DBOS-logo-300x300.png"
          alt="Board Logo"
          className="w-28 h-28 object-contain"
        />
        <h1 className="text-4xl font-extrabold tracking-wide text-blue-900 text-center uppercase">
          Dihing Board of Open Schooling
        </h1>
        <p className="text-base text-gray-700 font-semibold text-center">
          A Govt. Recognised Board | An ISO 9001:2015 Certified Board
        </p>
      </div>

      <div
        className="max-w-4xl mx-auto my-6 p-1 rounded-xl"
        style={{ background: "linear-gradient(121deg, #FF580A, #0D0D6B)" }}
      >
        <div className="p-5 rounded-xl bg-white">
          {/* Admin Controls */}
          <div className="flex items-center justify-between mb-6 print:hidden">
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
                onClick={handlePrint}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Print (Portrait)
              </button>
              <button
                onClick={goBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Back to Admin
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1 text-left font-extrabold text-2xl md:text-5xl tracking-wide text-blue-900 uppercase">
              Admission Form
            </div>
            <div className="flex flex-col items-center gap-2">
              {/* Photo Display */}
              {student.photoUrl && (
                <div className="w-40 h-40 border-2 border-blue-900 rounded-md bg-gray-50 flex items-center justify-center overflow-hidden">
                  <img
                    src={student.photoUrl}
                    alt="Student Photo"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div
            className="my-4 rounded-md"
            style={{
              background: "linear-gradient(121deg, #FF580A, #0D0D6B)",
            }}
          >
            <div className="rounded-md bg-white">
              <div
                className="h-0.5 w-full rounded-md"
                style={{
                  background: "linear-gradient(121deg, #FF580A, #0D0D6B)",
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {/* Application By */}
            <div className="mt-4">
              <label className="text-sm font-semibold text-blue-900">
                Admission By
              </label>
              <input
                type="text"
                value={editData.admissionBy || student.admissionBy || ""}
                onChange={(e) =>
                  handleInputChange("admissionBy", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-gray-800 print:border-2"
                readOnly={!isEditing}
              />
            </div>

            {/* Center/Coordinator Details */}
            {student.admissionBy === "Study Center" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderField("Center Name", "centerName", student.centerName)}
                {renderField("Center Code", "centerCode", student.centerCode)}
              </div>
            )}

            {student.admissionBy === "Counseling Center" && (
              <div>
                {renderField("Center Name", "centerName", student.centerName)}
              </div>
            )}

            {student.admissionBy === "State Cordinator" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderField(
                  "Cordinator Name",
                  "coordinatorName",
                  student.coordinatorName
                )}
                {renderField(
                  "Cordinator Code",
                  "coordinatorCode",
                  student.coordinatorCode
                )}
              </div>
            )}

            <div
              className="my-4 rounded-md"
              style={{
                background: "linear-gradient(121deg, #FF580A, #0D0D6B)",
              }}
            >
              <div className="rounded-md bg-white">
                <div
                  className="h-0.5 w-full rounded-md"
                  style={{
                    background: "linear-gradient(121deg, #FF580A, #0D0D6B)",
                  }}
                />
              </div>
            </div>

            {/* Student Name */}
            <div>
              <label className="text-sm font-semibold text-blue-900">
                Name of the Student
              </label>
              <input
                type="text"
                value={editData.studentName || student.studentName || ""}
                onChange={(e) =>
                  handleInputChange("studentName", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-gray-800 print:border-2"
                readOnly={!isEditing}
              />
            </div>

            {/* Parents Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderField("Father's Name", "fatherName", student.fatherName)}
              {renderField("Mother's Name", "motherName", student.motherName)}
            </div>

            {/* Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-semibold text-blue-900">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={
                    editData.dob
                      ? editData.dob.split("T")[0]
                      : student.dob
                      ? student.dob.split("T")[0]
                      : ""
                  }
                  onChange={(e) => handleInputChange("dob", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-gray-800 print:border-2"
                  readOnly={!isEditing}
                />
              </div>
              {renderField("Gender", "gender", student.gender)}
              {renderField("Nationality", "nationality", student.nationality)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {renderField("Caste", "caste", student.caste)}
              {renderField("Religion", "religion", student.religion)}
              {renderField(
                "Marital Status",
                "maritalStatus",
                student.maritalStatus
              )}
            </div>

            {/* Academic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderField(
                "Admission For",
                "admissionfor",
                student.admissionfor
              )}
              {student.admissionfor !== "Secondary (10th)" &&
                renderField("Stream", "stream", student.stream)}
            </div>

            {/* Subject Selection */}
            {student.admissionfor && (
              <div className="space-y-6">
                <div className="mt-5 mb-2 text-xl font-bold text-blue-900 border-b border-gray-200 pb-1">
                  Subject Selection
                </div>

                {/* Language Subjects */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 print:border-gray-800 print:border-2">
                  <h3 className="text-lg font-bold text-red-600 mb-4">
                    *LANGUAGE SUBJECTS
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {student.langSubject && student.langSubject.length > 0 ? (
                      student.langSubject.map((subject, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <span className="text-sm text-gray-700">
                            {subject}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full">
                        <input
                          type="text"
                          value={editData.langSubject || ""}
                          onChange={(e) =>
                            handleInputChange("langSubject", e.target.value)
                          }
                          placeholder="Enter language subjects (comma separated)"
                          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-gray-800 print:border-2"
                          readOnly={!isEditing}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Non-Language Subjects */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 print:border-gray-800 print:border-2">
                  <h3 className="text-lg font-bold text-red-600 mb-4">
                    *NON-LANGUAGE SUBJECTS
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {student["non-langSubject"] &&
                    student["non-langSubject"].length > 0 ? (
                      student["non-langSubject"].map((subject, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <span className="text-sm text-gray-700">
                            {subject}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full">
                        <input
                          type="text"
                          value={editData["non-langSubject"] || ""}
                          onChange={(e) =>
                            handleInputChange("non-langSubject", e.target.value)
                          }
                          placeholder="Enter non-language subjects (comma separated)"
                          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-gray-800 print:border-2"
                          readOnly={!isEditing}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Subjects */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 print:border-gray-800 print:border-2">
                  <h3 className="text-lg font-bold text-red-600 mb-4">
                    *ADDITIONAL SUBJECTS
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {student.addSubject && student.addSubject.length > 0 ? (
                      student.addSubject.map((subject, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <span className="text-sm text-gray-700">
                            {subject}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full">
                        <input
                          type="text"
                          value={editData.addSubject || ""}
                          onChange={(e) =>
                            handleInputChange("addSubject", e.target.value)
                          }
                          placeholder="Enter additional subjects (comma separated)"
                          className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-gray-800 print:border-2"
                          readOnly={!isEditing}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div
              className="my-4 rounded-md"
              style={{
                background: "linear-gradient(121deg, #FF580A, #0D0D6B)",
              }}
            >
              <div className="rounded-md bg-white">
                <div
                  className="h-0.5 w-full rounded-md"
                  style={{
                    background: "linear-gradient(121deg, #FF580A, #0D0D6B)",
                  }}
                />
              </div>
            </div>

            {/* Permanent Address */}
            <div className="mt-5 mb-2 text-xl font-bold text-blue-900 border-b border-gray-200 pb-1">
              Permanent Address
            </div>
            <div>
              <label className="text-sm font-semibold text-blue-900">
                Address Details
              </label>
              <textarea
                value={
                  editData.permanentAddress || student.permanentAddress || ""
                }
                onChange={(e) =>
                  handleInputChange("permanentAddress", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-gray-800 print:border-2 min-h-20 resize-y"
                readOnly={!isEditing}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderField("P.O.", "po", student.po)}
              {renderField("District", "district", student.district)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderField("State", "state", student.state)}
              {renderField("PIN", "permanentPin", student.permanentPin)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderField("Mobile No.", "mobile", student.mobile, "tel")}
              {renderField("Email Id", "email", student.email, "email")}
            </div>

            <div
              className="my-4 rounded-md"
              style={{
                background: "linear-gradient(121deg, #FF580A, #0D0D6B)",
              }}
            >
              <div className="rounded-md bg-white">
                <div
                  className="h-0.5 w-full rounded-md"
                  style={{
                    background: "linear-gradient(121deg, #FF580A, #0D0D6B)",
                  }}
                />
              </div>
            </div>

            {/* Aadhaar */}
            <div className="mt-5 mb-2 text-xl font-bold text-blue-900 border-b border-gray-200 pb-1">
              Aadhaar No.
            </div>
            <div>{renderField("", "aadhaar", student.aadhaar)}</div>

            {/* Present Address */}
            <div className="mt-5 mb-2 text-xl font-bold text-blue-900 border-b border-gray-200 pb-1 print-avoid-break">
              Present Address
            </div>
            <div className="print-avoid-break">
              <label className="text-sm font-semibold text-blue-900">
                Address Details
              </label>
              <textarea
                value={editData.presentAddress || student.presentAddress || ""}
                onChange={(e) =>
                  handleInputChange("presentAddress", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-gray-800 print:border-2 min-h-20 resize-y"
                readOnly={!isEditing}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 print-avoid-break">
              <div></div>
              <div>{renderField("PIN", "presentPin", student.presentPin)}</div>
              <div></div>
            </div>

            <div
              className="my-4 rounded-md"
              style={{
                background: "linear-gradient(121deg, #FF580A, #0D0D6B)",
              }}
            >
              <div className="rounded-md bg-white">
                <div
                  className="h-0.5 w-full rounded-md"
                  style={{
                    background: "linear-gradient(121deg, #FF580A, #0D0D6B)",
                  }}
                />
              </div>
            </div>

            {/* Qualifying Examination - Only for 12th */}
            {student.admissionfor === "Sr. Secondary (12th)" && (
              <>
                <div className="mt-5 mb-2 text-xl font-bold text-blue-900 border-b border-gray-200 pb-1">
                  Details of Qualifying Examination
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderField("Name of Exam", "examName", student.examName)}
                  {renderField("Board/Institution", "board", student.board)}
                  {renderField(
                    "Year of Passing",
                    "yearOfPassing",
                    student.yearOfPassing
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {renderField("Roll Number", "rollNumber", student.rollNumber)}
                  {renderField("Marks Obtained", "marks", student.marks)}
                  {renderField("Percentage", "percentage", student.percentage)}
                </div>
              </>
            )}

            {/* Session, Medium, Mode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {renderField("Session", "session", student.session)}
              {renderField("Medium", "medium", student.medium)}
              {renderField("Mode", "mode", student.mode)}
            </div>

            {/* Declaration - Visible in print with signature at bottom-right */}
            <div className="my-6 rounded-md overflow-hidden print-avoid-break">
              <div
                className="w-full text-center text-white font-extrabold uppercase tracking-wide py-2 underline"
                style={{
                  background:
                    "linear-gradient(121deg, #FF580A, #0F0F70, #FF580A)",
                }}
              >
                DECLARATION BY CANDIDATE
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start print-avoid-break">
              <div className="md:col-span-2 space-y-2 text-sm text-gray-800">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                    disabled
                  />
                  <span>
                    That I have carefully gone through the above application
                    form relating to admission and other particulars and filled
                    in the same by myself without being influenced by any
                    person.
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                    disabled
                  />
                  <span>
                    That particulars provided by me are true and correct to the
                    best of my knowledge, belief and information.
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                    disabled
                  />
                  <span>
                    That registration for the above mentioned course shall be in
                    force only when examination fee paid by Demand Draft /
                    Online payment is realized in Board Account only.
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                    disabled
                  />
                  <span>
                    That I have enclosed the self-attested copies of eligibility
                    documents and the same are true and correct; in case they
                    are found to be fake / fabricated / forged my admission is
                    liable to be cancelled.
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                    disabled
                  />
                  <span>
                    That during the entire duration of my course I will not
                    enroll myself for any other regular course in any other
                    University / College / Institution.
                  </span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                    disabled
                  />
                  <span>
                    I am aware and admit that fee deposited will not be
                    refundable and cannot be claimed at any point of time.
                  </span>
                </label>
              </div>

              {/* Signature bottom-right - no border, visible in print */}
              <div className="flex flex-col items-end justify-end gap-2">
                {uploads && uploads.signatureUrl && (
                  <div className="w-40 h-20 bg-transparent flex items-center justify-center overflow-hidden">
                    <img
                      src={uploads.signatureUrl}
                      alt="Student Signature"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <span className="text-xs text-gray-700">
                  Signature of Candidate
                </span>
              </div>
            </div>

            {/* Application Status */}
            <div className="print:hidden">
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
      </div>

      {/* Uploaded Documents Section - Outside the main form */}
      {uploads && uploads.documents && uploads.documents.length > 0 && (
        <div
          className="max-w-4xl mx-auto my-6 p-1 rounded-xl print:hidden"
          style={{ background: "linear-gradient(121deg, #FF580A, #0D0D6B)" }}
        >
          <div className="p-6 rounded-xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-blue-900">
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
                className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800"
              >
                Download All Documents
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploads.documents.map((docUrl, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">
                      Document {index + 1}
                    </h3>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full px-3 py-2 bg-blue-900 text-white text-center rounded-md hover:bg-blue-700 text-sm transition-colors"
                    >
                      View Document
                    </a>
                    <button
                      onClick={() =>
                        downloadDocument(docUrl, `document_${index + 1}.pdf`)
                      }
                      className="block w-full px-3 py-2 bg-green-600 text-white text-center rounded-md hover:bg-green-700 text-sm transition-colors"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {uploads.documents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>No documents uploaded yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;
