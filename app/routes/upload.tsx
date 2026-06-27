import PageLayout from "~/components/PageLayout";
import type { Route } from "./+types/upload";
import type { User } from "@supabase/supabase-js";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import LoadingSpinner from "~/components/LoadingSpinner";
import Navbar from "~/components/Navbar";
import { supabase } from "~/lib/supabase";
import FileUploader from "~/components/FileUploader";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Upload Resume | Resumind" },
    {
      name: "description",
      content: "Upload a resume and save application details.",
    },
  ];
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

    console.log({ companyName, jobTitle, jobDescription, file });
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
