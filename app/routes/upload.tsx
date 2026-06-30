import PageLayout from "~/components/PageLayout";
import type { Route } from "./+types/upload";
import type { User } from "@supabase/supabase-js";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import LoadingSpinner from "~/components/LoadingSpinner";
import Navbar from "~/components/Navbar";
import { supabase } from "~/lib/supabase";
import FileUploader from "~/components/FileUploader";
import { convertPdfToImage } from "~/lib/pdf2img";

const STORAGE_BUCKET = "resumes";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Upload Resume | Resumind" },
    {
      name: "description",
      content: "Upload a resume and save application details.",
    },
  ];
}

type AnalyzeActionResponse = { feedback: Feedback } | { error: string };

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
}

function getSafeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong.";
  }

  const message = error.message;

  const sensitivePatterns = [
    /database/i,
    /sql/i,
    /postgres/i,
    /relation/i,
    /column/i,
    /foreign key/i,
    /violates/i,
    /schema/i,
    /supabase/i,
    /key/i,
    /token/i,
    /jwt/i,
    /authorization/i,
    /fetch/i,
    /network/i,
    /connection/i,
    /socket/i,
    /http/i,
    /url/i,
    /sk-/i,
  ];

  const hasSensitiveInfo = sensitivePatterns.some((pattern) =>
    pattern.test(message),
  );

  if (hasSensitiveInfo) {
    return "An error occurred while analyzing your resume. Please try again.";
  }

  return message;
}

async function uploadToStorage(path: string, file: File) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
    });

  if (error) throw new Error(error.message);

  return data.path;
}

export default function Upload() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }

      setUser(session.user);
      setIsCheckingSession(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        navigate("/auth", { replace: true });
        return;
      }

      setUser(session.user);
      setIsCheckingSession(false);
    });

    loadSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  if (isCheckingSession || !user) {
    return (
      <PageLayout className="flex items-center justify-center">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  const handleFileSelect = (file: File | null) => {
    setFile(file);
    setFileError("");
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setIsProcessing(true);
    setStatusText("");
    setAnalysisError(null);

    try {
      if (!user.email) {
        throw new Error("Your account does not have an email address.");
      }

      const uuid = crypto.randomUUID();
      const safeFileName = sanitizeFileName(file.name);
      const basePath = `${user.id}/${uuid}`;
      const resumePath = `${basePath}/${safeFileName}`;

      setStatusText("Uploading the file...");
      const uploadedResumePath = await uploadToStorage(resumePath, file);

      setStatusText("Converting to image...");
      const imageFile = await convertPdfToImage(file);

      if (!imageFile.file) {
        throw new Error(imageFile.error ?? "Failed to convert PDF to image.");
      }

      setStatusText("Uploading the image...");
      const uploadedImagePath = await uploadToStorage(
        `${basePath}/${sanitizeFileName(imageFile.file.name)}`,
        imageFile.file,
      );

      setStatusText("Preparing data...");
      const { error: insertError } = await supabase.from("resumes").insert({
        id: uuid,
        user_id: user.id,
        user_email: user.email,
        company_name: companyName,
        job_title: jobTitle,
        job_description: jobDescription,
        resume_path: uploadedResumePath,
        image_path: uploadedImagePath,
        feedback: null,
      });

      if (insertError) throw new Error(insertError.message);

      setStatusText("Analyzing...");
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const analysisFormData = new FormData();
      analysisFormData.append("jobTitle", jobTitle);
      analysisFormData.append("jobDescription", jobDescription);
      analysisFormData.append("resumeImage", imageFile.file);

      const analysisResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: analysisFormData,
      });
      const analysis = (await analysisResponse.json()) as AnalyzeActionResponse;

      if (!analysisResponse.ok || "error" in analysis) {
        throw new Error(
          "error" in analysis ? analysis.error : "Failed to analyze resume.",
        );
      }

      const { error: updateError } = await supabase
        .from("resumes")
        .update({ feedback: analysis.feedback })
        .eq("id", uuid)
        .eq("user_id", user.id);

      if (updateError) throw new Error(updateError.message);

      setStatusText("Analysis complete, redirecting...");
      await new Promise((r) => setTimeout(r, 1500));
      navigate(`/resume/${uuid}`);
    } catch (error) {
      console.error("Resume analysis failed:", error);
      setAnalysisError(getSafeErrorMessage(error));
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const companyName = String(formData.get("companyName") ?? "").trim();
    const jobTitle = String(formData.get("jobTitle") ?? "").trim();
    const jobDescription = String(formData.get("jobDescription") ?? "").trim();

    if (!file) {
      setFileError("Please upload your resume as a PDF before continuing.");
      return;
    }

    handleAnalyze({
      companyName,
      jobTitle,
      jobDescription,
      file,
    });
  };

  return (
    <PageLayout>
      <Navbar user={user} onSignOut={handleSignOut} />
      <section className="upload-section">
        <div className="page-heading">
          <h1>Smart feedback for your dream job</h1>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img
                src="/images/resume-scan.gif"
                alt="Scanning resume"
                className="w-full"
              />
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips.</h2>
          )}
        </div>

        {!isProcessing && analysisError && (
          <div className="upload-error-banner">
            <div className="upload-error-content">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{analysisError}</span>
            </div>
            <button
              type="button"
              className="upload-error-dismiss"
              onClick={() => setAnalysisError(null)}
              aria-label="Dismiss error"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-5"
                aria-hidden="true"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}

        {!isProcessing && (
          <div className="upload-panel">
            <form id="upload-form" onSubmit={handleSubmit}>
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input
                  id="company-name"
                  name="companyName"
                  type="text"
                  placeholder="Acme Inc."
                  required
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input
                  id="job-title"
                  name="jobTitle"
                  type="text"
                  placeholder="Software Engineer"
                  required
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea
                  id="job-description"
                  name="jobDescription"
                  rows={8}
                  placeholder="Enter the job description..."
                  required
                />
              </div>
              <div className="form-div">
                <label htmlFor="resume-file">Upload Resume</label>
                <FileUploader
                  id="resume-file"
                  error={fileError}
                  disabled={isProcessing}
                  onFileSelect={handleFileSelect}
                />
              </div>

              <button
                type="submit"
                className="auth-button"
                disabled={isProcessing}
              >
                Save & Analyze Resume
              </button>
            </form>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
