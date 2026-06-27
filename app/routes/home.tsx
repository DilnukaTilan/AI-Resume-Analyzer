import type { Route } from "./+types/home";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Navbar from "~/components/Navbar";
import PageLayout from "~/components/PageLayout";
import LoadingSpinner from "~/components/LoadingSpinner";
import ResumeCard from "~/components/ResumeCard";
import { resumes } from "~/constants";
import { supabase } from "~/lib/supabase";

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

  return (
    <PageLayout>
      <Navbar user={user} onSignOut={handleSignOut} />
      <section className="main-section">
        <div className="page-heading">
          <h1>Track Your Applications & Resume Ratings</h1>
          <h2>Review your submissions and check AI-powered feedback.</h2>
        </div>

        {resumes.length > 0 && (
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
