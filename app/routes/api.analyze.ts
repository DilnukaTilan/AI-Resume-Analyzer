import type { Route } from "./+types/api.analyze";
import { supabase } from "~/lib/supabase";
import { analyzeResumeWithOpenAI } from "~/lib/openai.server";

export async function action({ request }: Route.ActionArgs) {
  const accessToken = request.headers
    .get("Authorization")
    ?.replace("Bearer ", "");

  if (!accessToken) {
    return Response.json(
      { error: "You must be signed in to analyze a resume." },
      { status: 401 },
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return Response.json(
      { error: "Your session expired. Please sign in again." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const jobDescription = String(formData.get("jobDescription") ?? "").trim();
  const resumeImage = formData.get("resumeImage");

  if (!jobTitle || !jobDescription) {
    return Response.json(
      { error: "Job title and job description are required." },
      { status: 400 },
    );
  }

  if (!(resumeImage instanceof File)) {
    return Response.json(
      { error: "A resume image is required for analysis." },
      { status: 400 },
    );
  }

  try {
    const feedback = await analyzeResumeWithOpenAI({
      jobTitle,
      jobDescription,
      resumeImage,
    });

    return Response.json({ feedback });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "OpenAI could not analyze the resume.",
      },
      { status: 502 },
    );
  }
}
