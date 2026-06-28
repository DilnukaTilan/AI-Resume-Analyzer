import { prepareInstructions } from "~/constants";

const feedbackSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overallScore",
    "ATS",
    "toneAndStyle",
    "content",
    "structure",
    "skills",
  ],
  properties: {
    overallScore: { type: "number" },
    ATS: { $ref: "#/$defs/category" },
    toneAndStyle: { $ref: "#/$defs/category" },
    content: { $ref: "#/$defs/category" },
    structure: { $ref: "#/$defs/category" },
    skills: { $ref: "#/$defs/category" },
  },
  $defs: {
    category: {
      type: "object",
      additionalProperties: false,
      required: ["score", "tips"],
      properties: {
        score: { type: "number" },
        tips: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["type", "tip", "explanation"],
            properties: {
              type: { type: "string", enum: ["good", "improve"] },
              tip: { type: "string" },
              explanation: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export async function analyzeResumeWithOpenAI({
  jobTitle,
  jobDescription,
  resumeImage,
}: {
  jobTitle: string;
  jobDescription: string;
  resumeImage: File;
}): Promise<Feedback> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY on the server.");
  }

  const imageDataUrl = await fileToDataUrl(resumeImage);

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prepareInstructions({ jobTitle, jobDescription }),
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "resume_feedback",
          strict: true,
          schema: feedbackSchema,
        },
      },
    }),
  });

  const responseJson = await openAiResponse.json();

  if (!openAiResponse.ok) {
    throw new Error(
      responseJson?.error?.message ?? "OpenAI could not analyze the resume.",
    );
  }

  const feedbackText = extractOutputText(responseJson);

  if (!feedbackText) {
    throw new Error("OpenAI returned an empty response.");
  }

  try {
    return JSON.parse(feedbackText);
  } catch {
    throw new Error("OpenAI returned feedback that was not valid JSON.");
  }
}

async function fileToDataUrl(file: File) {
  const imageData = Buffer.from(await file.arrayBuffer()).toString("base64");

  return `data:${file.type || "image/png"};base64,${imageData}`;
}

function extractOutputText(response: any) {
  if (typeof response.output_text === "string") return response.output_text;

  for (const output of response.output ?? []) {
    if (output.type !== "message") continue;

    for (const content of output.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}
