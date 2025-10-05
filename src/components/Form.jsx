import React, { useState } from "react";
import Uploads from "./Uploads";
import { storage, databases } from "../appwrite"; // make sure this points to your Appwrite client
import { ID, Query } from "appwrite";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;

const Form = () => {
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formSubmitted, setFormSubmitted] = useState(false);
  // CAPTCHA removed

  const initialForm = {
    studentName: "",
    fatherName: "",
    motherName: "",
    dob: "",
    gender: "",
    nationality: "",
    caste: "",
    religion: "",
    maritalStatus: "",
    stream: "",
    admissionfor: "",
    langSubject: [],
    "non-langSubject": [],
    addSubject: [],
    permanentAddress: "",
    mobile: "",
    email: "",
    permanentPin: "",
    aadhaar: "",
    presentAddress: "",
    presentPin: "",
    examName: "",
    board: "",
    yearOfPassing: "",
    rollNumber: "",
    marks: "",
    percentage: "",
    session: "",
    medium: "",
    mode: "Virtual Mode",
    // New optional fields
    admissionBy: "",
    centerName: "",
    centerCode: "",
    coordinatorName: "",
    coordinatorCode: "",
    state: "",
    district: "",
  };
  const [form, setForm] = useState(initialForm);
  // Declaration checks (must be accepted to submit)
  const [declaration, setDeclaration] = useState({
    c1: false,
    c2: false,
    c3: false,
    c4: false,
    c5: false,
    c6: false,
  });

  const requiredFields = [
    "studentName",
    "fatherName",
    "motherName",
    "dob",
    "gender",
    "nationality",
    "caste",
    "religion",
    "maritalStatus",
    "stream",
    "admissionfor",
    "permanentAddress",
    "mobile",
    "email",
    "permanentPin",
    "aadhaar",
    "presentAddress",
    "presentPin",
    "examName",
    "board",
    "yearOfPassing",
    "rollNumber",
    "marks",
    "percentage",
    "session",
    "medium",
    "mode",
  ];

  // Make 'stream' optional for Secondary (10th)
  const dynamicRequiredFields =
    form.admissionfor === "Secondary (10th)"
      ? requiredFields.filter((k) => k !== "stream")
      : requiredFields;

  const allFilled = dynamicRequiredFields.every(
    (k) => String(form[k] || "").trim().length > 0
  );

  // Ensure subject arrays are always defined
  const langSubject = form.langSubject || [];
  const nonLangSubject = form["non-langSubject"] || [];
  const addSubject = form.addSubject || [];

  // Subject options based on admission level
  const subjectOptions = {
    "Secondary (10th)": {
      language: ["Hindi", "English", "Bengali", "Assamese"],
      nonLanguage: ["Mathematics", "Science", "Social Science"],
      additional: ["Computer Science", "Data Entry Operator"],
    },
    "Sr. Secondary (12th)": {
      language: ["Hindi", "English", "Sanskrit", "Bengali", "Assamese"],
      nonLanguage: [
        "Mathematics",
        "Home Science*",
        "Psychology*",
        "Geography*",
        "Economics",
        "Business Studies",
        "Physics*",
        "History",
        "Environmental Science*",
        "Chemistry*",
        "Political Science",
        "Biology*",
        "Accountancy",
        "Introduction to Law",
        "Computer Science*",
        "Sociology",
        "Tourism",
        "Physical Education and Yoga*",
      ],
      additional: [
        "Computer Science",
        "Data Entry Operator",
        "Hotel Front Office Operation",
        "House Keeping",
      ],
    },
  };

  // Dropdown options
  const genderOptions = ["Male", "Female", "Other"];
  const admissionForOptions = ["Secondary (10th)", "Sr. Secondary (12th)"];
  const casteOptions = ["General", "SC", "ST", "OBC", "MOBC"];
  const religionOptions = [
    "Hindu",
    "Muslim",
    "Christian",
    "Sikh",
    "Buddhist",
    "Jain",
    "Other",
  ];
  const maritalStatusOptions = ["Single", "Married", "Divorced", "Widowed"];
  const streamOptions = ["Arts", "Commerce", "Non-Medical", "Medical"];
  const sessionOptions = ["December", "January"];
  const mediumOptions = ["English", "Hindi"];
  const modeOptions = ["Virtual Mode"];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDeclaration = (key) => {
    setDeclaration((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // CAPTCHA removed

  const handleCheckboxChange = (category, subject) => {
    setForm((prev) => {
      const currentArray = prev[category] || [];
      const isSelected = currentArray.includes(subject);

      let newArray;
      if (isSelected) {
        newArray = currentArray.filter((item) => item !== subject);
      } else {
        // Check limits based on category and admission level
        const limits = {
          "Secondary (10th)": {
            langSubject: 2,
            "non-langSubject": 3,
            addSubject: 1,
          },
          "Sr. Secondary (12th)": {
            langSubject: 2,
            "non-langSubject": 3,
            addSubject: 1,
          },
        };

        const limit = limits[prev.admissionfor]?.[category] || 0;
        if (currentArray.length >= limit) {
          alert(
            `You can only select ${limit} ${category
              .replace(/([A-Z])/g, " $1")
              .toLowerCase()}`
          );
          return prev;
        }

        newArray = [...currentArray, subject];
      }

      return { ...prev, [category]: newArray };
    });
  };

  // Photo Upload
  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setPhotoFile(file || null);
    if (!file) return setPhotoPreviewUrl("");

    const reader = new FileReader();
    reader.onload = () => setPhotoPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  // Helper to upload photo and return { id, url } on submit
  const uploadPhotoAndGetUrl = async (studentId) => {
    if (!photoFile) return { id: "", url: "" };
    if (!bucketId) throw new Error("Missing bucket id");

    const created = await storage.createFile(bucketId, ID.unique(), photoFile);
    console.log("Created file:", created);

    const viewRes = storage.getFileView(bucketId, created.$id);
    const viewUrl = typeof viewRes === "string" ? viewRes : viewRes?.href;
    console.log("Generated viewUrl:", viewUrl);

    if (!created?.$id) throw new Error("Photo upload failed: no fileId");
    if (!viewUrl || !viewUrl.startsWith("http"))
      throw new Error("Photo upload failed: invalid url " + viewUrl);

    const photoUrl = viewUrl;
    const uploadsCollectionId = import.meta.env
      .VITE_APPWRITE_COLLECTION_UPLOADS;

    // Check if student already has an uploads record
    const existingDocs = await databases.listDocuments(
      databaseId,
      uploadsCollectionId,
      [Query.equal("studentId", studentId)]
    );

    if (existingDocs.documents.length > 0) {
      // Update existing record with photo info
      const existingDoc = existingDocs.documents[0];
      await databases.updateDocument(
        databaseId,
        uploadsCollectionId,
        existingDoc.$id,
        {
          photoUrl,
          photoFileId: created.$id,
        }
      );
    } else {
      // Create new record for this student
      await databases.createDocument(
        databaseId,
        uploadsCollectionId,
        ID.unique(),
        {
          studentId,
          photoUrl,
          photoFileId: created.$id,
          documents: [],
        }
      );
    }

    return { id: created.$id, url: photoUrl };
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allFilled || !photoFile) {
      alert("Please fill all required fields and select passport photo");
      return;
    }

    setSubmitting(true);
    try {
      console.log("🔍 Step 1: Creating student document...");
      // 1. Create student document first to get the studentId

      // Transform form data to match database schema
      // Only include fields that belong in admissionform collection
      const formDataForDB = {
        studentName: form.studentName,
        fatherName: form.fatherName,
        motherName: form.motherName,
        dob: form.dob,
        gender: form.gender,
        nationality: form.nationality,
        caste: form.caste,
        religion: form.religion,
        maritalStatus: form.maritalStatus,
        stream: form.stream,
        admissionfor: form.admissionfor,
        langSubject: form.langSubject || [],
        "non-langSubject": form["non-langSubject"] || [],
        addSubject: form.addSubject || [],
        permanentAddress: form.permanentAddress,
        mobile: form.mobile,
        email: form.email,
        permanentPin: form.permanentPin,
        aadhaar: form.aadhaar,
        presentAddress: form.presentAddress,
        presentPin: form.presentPin,
        examName: form.examName,
        board: form.board,
        yearOfPassing: form.yearOfPassing,
        rollNumber: form.rollNumber,
        marks: form.marks,
        percentage: form.percentage,
        session: form.session,
        medium: form.medium,
        mode: form.mode,
        admissionBy: form.admissionBy || "",
        centerName: form.centerName || "",
        centerCode: form.centerCode || "",
        coordinatorName: form.coordinatorName || "",
        coordinatorCode: form.coordinatorCode || "",
        state: form.state || "",
        district: form.district || "",
      };

      console.log("Form data being sent to database:", formDataForDB);

      const studentDoc = await databases.createDocument(
        databaseId,
        collectionId,
        ID.unique(),
        formDataForDB
      );
      console.log("✅ Step 1: Student document created successfully");

      const newStudentId = studentDoc.$id;
      setStudentId(newStudentId); // Set studentId for Uploads component

      // 2. Upload photo with studentId
      console.log("🔍 Step 2: Uploading photo...");
      const { id: photoFileId, url: photoUrl } = await uploadPhotoAndGetUrl(
        newStudentId
      );
      console.log("✅ Step 2: Photo uploaded successfully");

      if (!photoFileId || !photoUrl) {
        throw new Error("Photo upload failed, required fields missing");
      }

      console.log("Document created:", studentDoc);

      // 3. Move to step 2 (document upload)
      setFormSubmitted(true);
      setCurrentStep(2);
      alert("Form submitted successfully! You can now upload your documents.");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const allDeclarationsChecked = Object.values(declaration).every(Boolean);
  const isSubmitDisabled =
    submitting ||
    !allFilled ||
    !photoFile ||
    (currentStep === 1 && !allDeclarationsChecked);

  // Step navigation functions
  const goToStep = (step) => {
    if (step === 1 || (step === 2 && formSubmitted)) {
      setCurrentStep(step);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setPhotoPreviewUrl("");
    setPhotoFile(null);
    setStudentId(null);
    setCurrentStep(1);
    setFormSubmitted(false);
    localStorage.removeItem("uploadedDocuments");
  };

  // Print page in landscape format
  const downloadFormPDF = async () => {
    const style = document.createElement("style");
    style.media = "print";
    style.innerHTML = `@page { size: A4 landscape; margin: 10mm; }`;
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

  const inputClass =
    "w-full px-3 py-2 border border-gray-400 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-900";
  const labelClass = "text-sm font-semibold text-blue-900";
  const sectionTitleClass =
    "mt-5 mb-2 text-xl font-bold text-blue-900 border-b border-gray-200 pb-1";

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
          {/* Step Navigation */}
          <div className="mb-8 print:hidden">
            <div className="flex items-center justify-center space-x-8">
              {/* Step 1 */}
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === 1
                      ? "bg-blue-600 text-white"
                      : formSubmitted
                      ? "bg-green-600 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {formSubmitted && currentStep !== 1 ? "✓" : "1"}
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium ${
                      currentStep === 1 || formSubmitted
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    Personal Information
                  </p>
                  <p className="text-xs text-gray-500">Fill form & submit</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-1 h-0.5 bg-gray-300 relative">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-300 ${
                    formSubmitted ? "bg-green-600" : "bg-gray-300"
                  }`}
                  style={{ width: formSubmitted ? "100%" : "0%" }}
                ></div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep === 2
                      ? "bg-blue-600 text-white"
                      : formSubmitted
                      ? "bg-gray-300 text-gray-600"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  2
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium ${
                      currentStep === 2
                        ? "text-blue-600"
                        : formSubmitted
                        ? "text-gray-600"
                        : "text-gray-500"
                    }`}
                  >
                    Document Upload
                  </p>
                  <p className="text-xs text-gray-500">Upload required docs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1 text-left font-extrabold text-2xl md:text-5xl tracking-wide text-blue-900 uppercase">
              {currentStep === 1 ? "Admission Form" : "Document Upload"}
            </div>
            {currentStep === 1 && (
              <div className="flex flex-col items-center gap-2">
                <label className="w-40 h-40 cursor-pointer">
                  <div className="w-full h-full border-2 border-dashed border-blue-900 rounded-md bg-gray-50 flex items-center justify-center overflow-hidden">
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt="Applicant"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-500 text-center px-2">
                        Upload passport size photo
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="sr-only print:hidden"
                  />
                </label>
                <div className="flex items-center gap-2 text-xs text-gray-500 print:hidden">
                  Photo will be uploaded when you submit the form.
                </div>
              </div>
            )}
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

          {/* Step 1: Personal Information Form */}
          {currentStep === 1 && (
            <form className="space-y-3" onSubmit={handleSubmit}>
              {/* Application By */}
              <div className="mt-4">
                <label className={labelClass}>Admission By</label>
                <select
                  className={inputClass}
                  name="admissionBy"
                  value={form.admissionBy}
                  onChange={handleInputChange}
                >
                  <option value="">Select</option>
                  <option value="Study Center">Study Center</option>
                  <option value="Counseling Center">Counseling Center</option>
                  <option value="State Cordinator">State Cordinator</option>
                </select>
              </div>

              {form.admissionBy === "Study Center" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Center Name</label>
                    <input
                      className={inputClass}
                      type="text"
                      name="centerName"
                      value={form.centerName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Center Code</label>
                    <input
                      className={inputClass}
                      type="text"
                      name="centerCode"
                      value={form.centerCode}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}

              {form.admissionBy === "Counseling Center" && (
                <div>
                  <label className={labelClass}>Center Name</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="centerName"
                    value={form.centerName}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              {form.admissionBy === "State Cordinator" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Cordinator Name</label>
                    <input
                      className={inputClass}
                      type="text"
                      name="coordinatorName"
                      value={form.coordinatorName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Cordinator Code</label>
                    <input
                      className={inputClass}
                      type="text"
                      name="coordinatorCode"
                      value={form.coordinatorCode}
                      onChange={handleInputChange}
                    />
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

              <div>
                <label className={labelClass}>Name of the Student</label>
                <input
                  className={inputClass}
                  type="text"
                  name="studentName"
                  placeholder="Enter full name"
                  value={form.studentName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Father's Name</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="fatherName"
                    value={form.fatherName}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>Mother's Name</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="motherName"
                    value={form.motherName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input
                    className={inputClass}
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>Gender</label>
                  <select
                    className={inputClass}
                    name="gender"
                    value={form.gender}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Gender</option>
                    {genderOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Nationality</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="nationality"
                    value={form.nationality}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Caste</label>
                  <select
                    className={inputClass}
                    name="caste"
                    value={form.caste}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Caste</option>
                    {casteOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Religion</label>
                  <select
                    className={inputClass}
                    name="religion"
                    value={form.religion}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Religion</option>
                    {religionOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Marital Status</label>
                  <select
                    className={inputClass}
                    name="maritalStatus"
                    value={form.maritalStatus}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Status</option>
                    {maritalStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Admission For</label>
                  <select
                    className={inputClass}
                    name="admissionfor"
                    value={form.admissionfor}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Level</option>
                    {admissionForOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {form.admissionfor !== "Secondary (10th)" && (
                  <div>
                    <label className={labelClass}>Stream</label>
                    <select
                      className={inputClass}
                      name="stream"
                      value={form.stream}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Stream</option>
                      {streamOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Subject Selection */}
              {form.admissionfor && (
                <div className="space-y-6">
                  <div className={sectionTitleClass}>Subject Selection</div>

                  {/* Language Subjects */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-red-600 mb-4">
                      *CHOOSE 2 LANGUAGE SUBJECTS
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {subjectOptions[form.admissionfor]?.language.map(
                        (subject) => (
                          <label
                            key={subject}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={langSubject.includes(subject)}
                              onChange={() =>
                                handleCheckboxChange("langSubject", subject)
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {subject}
                            </span>
                          </label>
                        )
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Selected: {langSubject.length}/2
                    </p>
                  </div>

                  {/* Non-Language Subjects */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-red-600 mb-4">
                      *CHOOSE 3 NON-LANGUAGE SUBJECTS
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {subjectOptions[form.admissionfor]?.nonLanguage.map(
                        (subject) => (
                          <label
                            key={subject}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={nonLangSubject.includes(subject)}
                              onChange={() =>
                                handleCheckboxChange("non-langSubject", subject)
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {subject}
                            </span>
                          </label>
                        )
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Selected: {nonLangSubject.length}/3
                    </p>
                  </div>

                  {/* Additional Subjects */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-red-600 mb-4">
                      *CHOOSE 1 ADDITIONAL SUBJECT
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {subjectOptions[form.admissionfor]?.additional.map(
                        (subject) => (
                          <label
                            key={subject}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={addSubject.includes(subject)}
                              onChange={() =>
                                handleCheckboxChange("addSubject", subject)
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {subject}
                            </span>
                          </label>
                        )
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Selected: {addSubject.length}/1
                    </p>
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

              <div className={sectionTitleClass}>Permanent Address</div>
              <div>
                <textarea
                  className={`${inputClass} min-h-20 resize-y`}
                  name="permanentAddress"
                  value={form.permanentAddress}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Mobile No.</label>
                  <input
                    className={inputClass}
                    type="tel"
                    name="mobile"
                    value={form.mobile}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email Id</label>
                  <input
                    className={inputClass}
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>PIN</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="permanentPin"
                    value={form.permanentPin}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelClass}>State</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>District</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="district"
                    value={form.district}
                    onChange={handleInputChange}
                  />
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

              <div className={sectionTitleClass}>Aadhaar No.</div>

              <div>
                <input
                  className={inputClass}
                  type="text"
                  name="aadhaar"
                  value={form.aadhaar}
                  onChange={handleInputChange}
                />
              </div>

              <div className={sectionTitleClass}>Present Address</div>
              <div>
                <textarea
                  className={`${inputClass} min-h-20 resize-y`}
                  name="presentAddress"
                  value={form.presentAddress}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div></div>
                <div>
                  <label className={labelClass}>PIN</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="presentPin"
                    value={form.presentPin}
                    onChange={handleInputChange}
                  />
                </div>
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

              <div className={sectionTitleClass}>
                Details of Qualifying Examination
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Name of Exam</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="examName"
                    value={form.examName}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>Board/Institution</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="board"
                    value={form.board}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>Year of Passing</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="yearOfPassing"
                    value={form.yearOfPassing}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Roll Number</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="rollNumber"
                    value={form.rollNumber}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>Marks Obtained</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="marks"
                    value={form.marks}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className={labelClass}>Percentage</label>
                  <input
                    className={inputClass}
                    type="text"
                    name="percentage"
                    value={form.percentage}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Session</label>
                  <select
                    className={inputClass}
                    name="session"
                    value={form.session}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Session</option>
                    {sessionOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Medium</label>
                  <select
                    className={inputClass}
                    name="medium"
                    value={form.medium}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Medium</option>
                    {mediumOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Mode</label>
                  <select
                    className={inputClass}
                    name="mode"
                    value={form.mode}
                    onChange={handleInputChange}
                  >
                    {modeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Declaration Banner */}
              <div className="my-6 rounded-md overflow-hidden">
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

              {/* Declaration Checks */}
              <div className="space-y-2 text-sm text-gray-800">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration.c1}
                    onChange={() => toggleDeclaration("c1")}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span>
                    That I have carefully gone through the above application
                    form relating to admission and other particulars and filled
                    in the same by myself without being influenced by any
                    person.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration.c2}
                    onChange={() => toggleDeclaration("c2")}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span>
                    That particulars provided by me are true and correct to the
                    best of my knowledge, belief and information.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration.c3}
                    onChange={() => toggleDeclaration("c3")}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span>
                    That registration for the above mentioned course shall be in
                    force only when examination fee paid by Demand Draft /
                    Online payment is realized in Board Account only.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration.c4}
                    onChange={() => toggleDeclaration("c4")}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span>
                    That I have enclosed the self-attested copies of eligibility
                    documents and the same are true and correct; in case they
                    are found to be fake / fabricated / forged my admission is
                    liable to be cancelled.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration.c5}
                    onChange={() => toggleDeclaration("c5")}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span>
                    That during the entire duration of my course I will not
                    enroll myself for any other regular course in any other
                    University / College / Institution.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration.c6}
                    onChange={() => toggleDeclaration("c6")}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span>
                    I am aware and admit that fee deposited will not be
                    refundable and cannot be claimed at any point of time.
                  </span>
                </label>
              </div>

              <div className="mt-6 flex gap-3 print:hidden">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-900 text-white border border-blue-500 hover:bg-blue-700 disabled:opacity-60"
                  disabled={isSubmitDisabled}
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => downloadFormPDF()}
                  className="px-4 py-2 rounded-md bg-green-600 text-white border border-green-500 hover:bg-green-700"
                  disabled={!form.studentName}
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
                  onClick={resetForm}
                >
                  Reset
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Document Upload */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">
                    Form Submitted Successfully!
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Your admission form has been submitted. You can now upload
                  your required documents.
                </p>
              </div>

              <Uploads studentId={studentId} />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="px-4 py-2 rounded-md bg-gray-600 text-white border border-gray-500 hover:bg-gray-700"
                >
                  ← Back to Form
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
                >
                  Start New Application
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Form;
