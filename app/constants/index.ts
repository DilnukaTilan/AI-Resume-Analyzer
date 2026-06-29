export const AIResponseFormat = `
interface Feedback {
  overallScore: number;
  ATS: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  toneAndStyle: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  content: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  structure: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  skills: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
}`;

export const prepareInstructions = ({
  jobTitle,
  jobDescription,
}: {
  jobTitle: string;
  jobDescription: string;
}) =>
  `You are an expert in ATS (Applicant Tracking System) and resume analysis.
      Analyze and rate this resume, then provide actionable suggestions for improvement.
      Be thorough and specific. Point out mistakes, weaknesses, and areas that need stronger evidence.
      Assign low scores when the resume has significant issues. This is to help the user improve their resume.
      Use the job title and job description to evaluate how well the resume matches the role.
      The job title is: ${jobTitle}
      The job description is: ${jobDescription}
      Provide feedback that matches the following TypeScript interface:
      ${AIResponseFormat}
      Rules:
      - Return only a valid JSON object.
      - The JSON object must conform to the TypeScript interface above.
      - Do not include Markdown code fences, backticks, comments, or any extra text.
      - Use scores from 0 to 100.
      - Include 3 to 4 tips in each category.
      - Set each tip type to either "good" or "improve".
      - Keep each tip as a short title.
      - Use each explanation to give concrete, detailed feedback.`;
