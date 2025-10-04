import React, { useState } from "react";
import Uploads from "./Uploads";
import { storage, databases } from "../appwrite"; // make sure this points to your Appwrite client
import { ID } from "appwrite";
import jsPDF from "jspdf";

const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const bucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;

const Form = () => {
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [studentId, setStudentId] = useState(null);

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
    subject_1: "",
    subject_2: "",
    subject_3: "",
    subject_4: "",
    subject_5: "",
    subject_6: "",
    additionalSubject_1: "",
    additionalSubject_2: "",
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
    "subject_1",
    "subject_2",
    "subject_3",
    "subject_4",
    "subject_5",
    "subject_6",
  ];

  const allFilled = requiredFields.every(
    (k) => String(form[k] || "").trim().length > 0
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

    const existingDocs = await databases.listDocuments(
      databaseId,
      uploadsCollectionId,
      []
    );

    if (existingDocs.documents.length > 0) {
      const existingDoc = existingDocs.documents[0];
      await databases.updateDocument(
        databaseId,
        uploadsCollectionId,
        existingDoc.$id,
        {
          studentId,
          photoUrl,
          photoFileId: created.$id,
        }
      );
    } else {
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
      const studentDoc = await databases.createDocument(
        databaseId,
        collectionId,
        ID.unique(),
        {
          ...form,
        }
      );
      console.log("✅ Step 1: Student document created successfully");

      const studentId = studentDoc.$id;
      setStudentId(studentId); // Set studentId for Uploads component

      // 2. Upload photo with studentId
      console.log("🔍 Step 2: Uploading photo...");
      const { id: photoFileId, url: photoUrl } = await uploadPhotoAndGetUrl(
        studentId
      );
      console.log("✅ Step 2: Photo uploaded successfully");

      if (!photoFileId || !photoUrl) {
        throw new Error("Photo upload failed, required fields missing");
      }

      // 3. Documents are already saved in uploads collection via Uploads component
      console.log("✅ Step 3: Documents are managed in uploads collection");

      console.log("Document created:", studentDoc);
      alert("Form submitted successfully!");

      // 4. Reset form
      setForm(initialForm);
      setPhotoPreviewUrl("");
      setPhotoFile(null);
      localStorage.removeItem("uploadedDocuments"); // Clear uploaded documents

      // 5. Reload page after successful submission
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Wait 1.5 seconds to show success message
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = submitting || !allFilled || !photoFile;

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

    checkNewPage(30);

    // Subjects Section
    pdf.setFont("helvetica", "bold");
    addText("SUBJECTS SELECTED", margin, yPosition);
    yPosition += 10;

    pdf.setFont("helvetica", "normal");
    for (let i = 1; i <= 6; i++) {
      const subject = form[`subject_${i}`];
      if (subject) {
        addText(`${i}. ${subject}`, margin, yPosition);
      }
    }

    // Additional Subjects
    if (form.additionalSubject_1 || form.additionalSubject_2) {
      yPosition += 5;
      pdf.setFont("helvetica", "bold");
      addText("ADDITIONAL SUBJECTS", margin, yPosition);
      yPosition += 5;
      pdf.setFont("helvetica", "normal");

      if (form.additionalSubject_1) {
        addText(`1. ${form.additionalSubject_1}`, margin, yPosition);
      }
      if (form.additionalSubject_2) {
        addText(`2. ${form.additionalSubject_2}`, margin, yPosition);
      }
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
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex-1 text-left font-extrabold text-2xl tracking-wide text-blue-900 uppercase">
            Admission Form
          </div>
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
        </div>

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
              <input
                className={inputClass}
                type="text"
                name="gender"
                placeholder="Male / Female / Other"
                value={form.gender}
                onChange={handleInputChange}
              />
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
              <input
                className={inputClass}
                type="text"
                name="caste"
                placeholder="Gen / SC / ST / OBC / MOBC"
                value={form.caste}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className={labelClass}>Religion</label>
              <input
                className={inputClass}
                type="text"
                name="religion"
                value={form.religion}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className={labelClass}>Marital Status</label>
              <input
                className={inputClass}
                type="text"
                name="maritalStatus"
                value={form.maritalStatus}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Stream</label>
            <input
              className={inputClass}
              type="text"
              name="stream"
              placeholder="Arts / Commerce / Non-Medical / Medical"
              value={form.stream}
              onChange={handleInputChange}
            />
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

          <div className={sectionTitleClass}>Subject Selected</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <React.Fragment key={index}>
                <div className="self-center text-gray-500">{index}.</div>
                <input
                  className={inputClass}
                  type="text"
                  name={`subject_${index}`}
                  value={form[`subject_${index}`]}
                  onChange={handleInputChange}
                />
              </React.Fragment>
            ))}
          </div>

          <div className={sectionTitleClass}>Additional Subject (If any)</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
            {[1, 2].map((index) => (
              <React.Fragment key={index}>
                <div className="self-center text-gray-500">{index}.</div>
                <input
                  className={inputClass}
                  type="text"
                  name={`additionalSubject_${index}`}
                  value={form[`additionalSubject_${index}`]}
                  onChange={handleInputChange}
                />
              </React.Fragment>
            ))}
          </div>

          <Uploads studentId={studentId} />

          <div className="mt-6 flex gap-3">
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
              type="reset"
              className="px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
              onClick={() => {
                setForm(initialForm);
                setPhotoPreviewUrl("");
                setPhotoFile(null);
                localStorage.removeItem("uploadedDocuments"); // Clear uploaded documents
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Form;
