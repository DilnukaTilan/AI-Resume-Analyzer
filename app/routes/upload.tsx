import PageLayout from "~/components/PageLayout";
import type { Route } from "./+types/upload";
import type { User } from "@supabase/supabase-js";
import { type FormEvent, useEffect, useState } from "react";
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {};

  return (
    <PageLayout>
      <Navbar user={user} onSignOut={handleSignOut} />
      <section className="upload-section">
        <div className="page-heading">
          <h1>Smart feedback for your dream job</h1>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img src="/images/resume-scan.gif" className="w-full" />
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
                <FileUploader />
              </div>

              <button type="submit" className="auth-button">
                Save & Analyze Resume
              </button>
            </form>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
