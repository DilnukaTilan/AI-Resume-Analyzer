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

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Upload Resume | Resumind" },
    {
      name: "description",
      content: "Upload a resume and save application details.",
    },
  ];
}

const STORAGE_BUCKET = "resumes";

type AnalyzeActionResponse = { feedback: Feedback } | { error: string };



function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
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

      console.log("feedback:", analysis.feedback);

      const { error: updateError } = await supabase
        .from("resumes")
        .update({ feedback: analysis.feedback })
        .eq("id", uuid)
        .eq("user_id", user.id);

      if (updateError) throw new Error(updateError.message);

      setStatusText("Analysis complete, redirecting...");
      navigate(`/resume/${uuid}`);
    } catch (error) {
      setStatusText(
        `Error: ${error instanceof Error ? error.message : "Something went wrong."}`,
      );
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
