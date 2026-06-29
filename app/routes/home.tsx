import type { Route } from "./+types/home";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Navbar from "~/components/Navbar";
import PageLayout from "~/components/PageLayout";
import LoadingSpinner from "~/components/LoadingSpinner";
import ResumeCard from "~/components/ResumeCard";
import { supabase } from "~/lib/supabase";

const STORAGE_BUCKET = "resumes";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);
  const [resumesError, setResumesError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const fetchResumes = async () => {
      setIsLoadingResumes(true);
      setResumesError(null);

      const { data, error } = await supabase
        .from("resumes")
        .select(
          "id, company_name, job_title, image_path, resume_path, feedback",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setResumesError(error.message);
        setIsLoadingResumes(false);
        return;
      }

      const mapped: Resume[] = (data ?? []).map((row) => ({
        id: row.id,
        companyName: row.company_name,
        jobTitle: row.job_title,
        imagePath: supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(row.image_path).data.publicUrl,
        resumePath: row.resume_path,
        feedback: row.feedback,
      }));

      setResumes(mapped);
      setIsLoadingResumes(false);
    };

    fetchResumes();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

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

  return (
    <PageLayout>
      <Navbar user={user} onSignOut={handleSignOut} />
      <section className="main-section">
        <div className="page-heading">
          <h1>Track Your Applications & Resume Ratings</h1>
          <h2>Review your submissions and check AI-powered feedback.</h2>
        </div>

        {isLoadingResumes ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : resumesError ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-red-400 text-lg">
              Failed to load resumes: {resumesError}
            </p>
          </div>
        ) : resumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-gray-400 text-lg text-center">
              No resumes yet. Upload your first resume to get started!
            </p>
          </div>
        ) : (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}
      </section>
    </PageLayout>
  );
}
