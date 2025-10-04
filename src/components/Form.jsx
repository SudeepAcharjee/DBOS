import React, { useState } from "react";
import Uploads from "./Uploads";
import { storage, databases } from "../appwrite"; // make sure this points to your Appwrite client
import { ID, Query } from "appwrite";
import jsPDF from "jspdf";

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
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaCorrect, setCaptchaCorrect] = useState(false);

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
  };
  const [form, setForm] = useState(initialForm);

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

  const allFilled = requiredFields.every(
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

  // Generate CAPTCHA question
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ["+", "-", "*"];
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let question, answer;
    switch (operation) {
      case "+":
        question = `${num1} + ${num2}`;
        answer = num1 + num2;
        break;
      case "-":
        question = `${num1} - ${num2}`;
        answer = num1 - num2;
        break;
      case "*":
        question = `${num1} × ${num2}`;
        answer = num1 * num2;
        break;
      default:
        question = `${num1} + ${num2}`;
        answer = num1 + num2;
    }

    setCaptchaQuestion(question);
    setCaptchaAnswer(answer.toString());
    setCaptchaCorrect(false);
    setCaptchaAnswer("");
  };

  // Validate CAPTCHA
  const validateCaptcha = (userAnswer) => {
    return userAnswer.trim() === captchaAnswer;
  };

  // Handle CAPTCHA input change
  const handleCaptchaChange = (e) => {
    const value = e.target.value;
    setCaptchaAnswer(value);
    setCaptchaCorrect(validateCaptcha(value));
  };

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

    // Show CAPTCHA if not already shown
    if (!showCaptcha) {
      setShowCaptcha(true);
      generateCaptcha();
      return;
    }

    // Validate CAPTCHA before proceeding
    if (!captchaCorrect) {
      alert("Please solve the CAPTCHA correctly");
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

  const isSubmitDisabled =
    submitting || !allFilled || !photoFile || (showCaptcha && !captchaCorrect);

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
    setShowCaptcha(false);
    setCaptchaQuestion("");
    setCaptchaAnswer("");
    setCaptchaCorrect(false);
    localStorage.removeItem("uploadedDocuments");
  };

  // Generate and download PDF
  const downloadFormPDF = async () => {
    const pdf = new jsPDF();
    let yPosition = 20;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    // Helper function to add text with word wrap
    const addText = (text, x = margin, y = yPosition, maxWidth = 170) => {
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      yPosition += lines.length * lineHeight;
      return yPosition;
    };

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace = 20) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        yPosition = 20;
      }
    };

    // Add logo function
    const addLogo = () => {
      return new Promise((resolve) => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const img = new Image();

          img.onload = () => {
            // Set canvas size
            canvas.width = 60;
            canvas.height = 60;

            // Draw image on canvas
            ctx.drawImage(img, 0, 0, 60, 60);

            // Convert canvas to data URL
            const dataURL = canvas.toDataURL("image/png");

            // Add image to PDF
            pdf.addImage(dataURL, "PNG", 20, 20, 30, 30);
            resolve();
          };

          img.onerror = () => {
            console.log("Could not load logo image");
            resolve(); // Continue without logo
          };

          img.src = "/DBOS-logo-300x300.png";
        } catch (error) {
          console.log("Could not add logo to PDF:", error);
          resolve(); // Continue without logo
        }
      });
    };

    // Add logo and wait for it to complete
    await addLogo();

    // Header
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    addText("DIHING BOARD OF OPEN SCHOOLING", 70, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    addText(
      "A Govt. Recognised Board | An ISO 9001:2015 Certified Board",
      60,
      yPosition
    );
    yPosition += 15;

    // Form Title
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    addText("ADMISSION FORM", 85, yPosition);
    yPosition += 15;

    // Personal Information Section
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    addText("PERSONAL INFORMATION", margin, yPosition);
    yPosition += 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    // Student Details
    addText(
      `Name of the Student: ${form.studentName || "N/A"}`,
      margin,
      yPosition
    );
    addText(`Father's Name: ${form.fatherName || "N/A"}`, margin, yPosition);
    addText(`Mother's Name: ${form.motherName || "N/A"}`, margin, yPosition);
    addText(`Date of Birth: ${form.dob || "N/A"}`, margin, yPosition);
    addText(`Gender: ${form.gender || "N/A"}`, margin, yPosition);
    addText(`Nationality: ${form.nationality || "N/A"}`, margin, yPosition);
    addText(`Caste: ${form.caste || "N/A"}`, margin, yPosition);
    addText(`Religion: ${form.religion || "N/A"}`, margin, yPosition);
    addText(
      `Marital Status: ${form.maritalStatus || "N/A"}`,
      margin,
      yPosition
    );
    addText(`Stream: ${form.stream || "N/A"}`, margin, yPosition);
    addText(`Admission For: ${form.admissionfor || "N/A"}`, margin, yPosition);

    checkNewPage(30);

    // Address Section
    pdf.setFont("helvetica", "bold");
    addText("ADDRESS INFORMATION", margin, yPosition);
    yPosition += 10;

    pdf.setFont("helvetica", "normal");
    addText(
      `Permanent Address: ${form.permanentAddress || "N/A"}`,
      margin,
      yPosition
    );
    addText(`Mobile No.: ${form.mobile || "N/A"}`, margin, yPosition);
    addText(`Email Id: ${form.email || "N/A"}`, margin, yPosition);
    addText(`PIN: ${form.permanentPin || "N/A"}`, margin, yPosition);
    addText(`Aadhaar No.: ${form.aadhaar || "N/A"}`, margin, yPosition);
    addText(
      `Present Address: ${form.presentAddress || "N/A"}`,
      margin,
      yPosition
    );
    addText(`Present PIN: ${form.presentPin || "N/A"}`, margin, yPosition);

    checkNewPage(30);

    // Academic Information Section
    pdf.setFont("helvetica", "bold");
    addText("ACADEMIC INFORMATION", margin, yPosition);
    yPosition += 10;

    pdf.setFont("helvetica", "normal");
    addText(`Name of Exam: ${form.examName || "N/A"}`, margin, yPosition);
    addText(`Board/Institution: ${form.board || "N/A"}`, margin, yPosition);
    addText(
      `Year of Passing: ${form.yearOfPassing || "N/A"}`,
      margin,
      yPosition
    );
    addText(`Roll Number: ${form.rollNumber || "N/A"}`, margin, yPosition);
    addText(`Marks Obtained: ${form.marks || "N/A"}`, margin, yPosition);
    addText(`Percentage: ${form.percentage || "N/A"}`, margin, yPosition);
    addText(`Session: ${form.session || "N/A"}`, margin, yPosition);
    addText(`Medium: ${form.medium || "N/A"}`, margin, yPosition);
    addText(`Mode: ${form.mode || "N/A"}`, margin, yPosition);

    checkNewPage(30);

    // Subjects Section
    pdf.setFont("helvetica", "bold");
    addText("SUBJECTS SELECTED", margin, yPosition);
    yPosition += 10;

    pdf.setFont("helvetica", "normal");

    // Language Subjects
    if (form.langSubject && form.langSubject.length > 0) {
      pdf.setFont("helvetica", "bold");
      addText("Language Subjects:", margin, yPosition);
      yPosition += 5;
      pdf.setFont("helvetica", "normal");
      form.langSubject.forEach((subject, index) => {
        addText(`${index + 1}. ${subject}`, margin, yPosition);
      });
      yPosition += 5;
    }

    // Non-Language Subjects
    if (form["non-langSubject"] && form["non-langSubject"].length > 0) {
      pdf.setFont("helvetica", "bold");
      addText("Non-Language Subjects:", margin, yPosition);
      yPosition += 5;
      pdf.setFont("helvetica", "normal");
      form["non-langSubject"].forEach((subject, index) => {
        addText(`${index + 1}. ${subject}`, margin, yPosition);
      });
      yPosition += 5;
    }

    // Additional Subjects
    if (form.addSubject && form.addSubject.length > 0) {
      pdf.setFont("helvetica", "bold");
      addText("Additional Subjects:", margin, yPosition);
      yPosition += 5;
      pdf.setFont("helvetica", "normal");
      form.addSubject.forEach((subject, index) => {
        addText(`${index + 1}. ${subject}`, margin, yPosition);
      });
    }

    // Footer
    yPosition += 20;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "italic");
    addText(
      "This form was generated on: " + new Date().toLocaleDateString(),
      margin,
      yPosition
    );

    // Download the PDF
    pdf.save(
      `admission-form-${
        form.studentName || "student"
      }-${new Date().getTime()}.pdf`
    );
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

      <div className="max-w-4xl mx-auto my-6 p-5 border border-blue-900 rounded-lg bg-white">
        {/* Step Navigation */}
        <div className="mb-8">
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
          <div className="flex-1 text-left font-extrabold text-2xl tracking-wide text-blue-900 uppercase">
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
                  className="sr-only"
                />
              </label>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                Photo will be uploaded when you submit the form.
              </div>
            </div>
          )}
        </div>

        {/* Step 1: Personal Information Form */}
        {currentStep === 1 && (
          <form className="space-y-3" onSubmit={handleSubmit}>
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

            {/* CAPTCHA Section */}
            {showCaptcha && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    className="w-5 h-5 text-yellow-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold text-yellow-800">
                    Security Verification
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  Please solve the math problem below to verify you are human:
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-800 bg-white px-3 py-2 border border-gray-300 rounded">
                      {captchaQuestion} = ?
                    </span>
                    <button
                      type="button"
                      onClick={generateCaptcha}
                      className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded border"
                      title="Generate new CAPTCHA"
                    >
                      🔄
                    </button>
                  </div>
                  <input
                    type="text"
                    value={captchaAnswer}
                    onChange={handleCaptchaChange}
                    placeholder="Your answer"
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {captchaCorrect && (
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      ✓ Correct!
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-blue-900 text-white border border-blue-500 hover:bg-blue-700 disabled:opacity-60"
                disabled={isSubmitDisabled}
              >
                {showCaptcha
                  ? captchaCorrect
                    ? "Submit Form"
                    : "Solve CAPTCHA First"
                  : "Submit"}
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
                Your admission form has been submitted. You can now upload your
                required documents.
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
  );
};

export default Form;
