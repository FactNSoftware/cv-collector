import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import path from "path";
import { pathToFileURL } from "url";
import { z } from "zod";
import type { JobRecord } from "./jobs";

const DEFAULT_ATS_MODEL = "gpt-4o-mini";
const MAX_RESUME_TEXT_CHARS = 20_000;

let openAiClient: OpenAI | null | undefined;
const pdfParseWorkerPath = path.resolve(
  process.cwd(),
  "node_modules/pdf-parse/dist/worker/pdf.worker.mjs",
);

const atsAnalysisSchema = z.object({
  candidateSummary: z.string().default(""),
  normalizedSkills: z.array(z.string()).default([]),
  relevantRoles: z.array(z.string()).default([]),
  education: z.array(z.string()).default([]),
  yearsOfExperience: z.number().nullable().default(null),
  matchedRequiredKeywords: z.array(z.string()).default([]),
  missingRequiredKeywords: z.array(z.string()).default([]),
  matchedPreferredKeywords: z.array(z.string()).default([]),
  missingPreferredKeywords: z.array(z.string()).default([]),
  confidenceNotes: z.string().default(""),
});

export type AtsEvaluation = {
  score: number | null;
  method: "ai" | "rules" | "none";
  summary: string;
  candidateSummary: string;
  confidenceNotes: string;
  extractedTextPreview: string;
  normalizedSkills: string[];
  relevantRoles: string[];
  education: string[];
  yearsOfExperience: number | null;
  requiredMatched: string[];
  requiredMissing: string[];
  preferredMatched: string[];
  preferredMissing: string[];
  evaluatedAt: string | null;
};

const normalizeKeyword = (value: string) => {
  return value.trim().replace(/\s+/g, " ");
};

const normalizeSearchText = (value: string) => {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
};

const normalizeUniqueStrings = (values: string[]) => {
  const unique = new Map<string, string>();

  for (const value of values) {
    const normalized = normalizeKeyword(value);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (!unique.has(key)) {
      unique.set(key, normalized);
    }
  }

  return [...unique.values()];
};

export const parseAtsKeywordInput = (value: string | string[] | null | undefined) => {
  const rawValues = Array.isArray(value)
    ? value
    : (value ?? "")
        .split(/\r?\n|,/)
        .map((item) => item.trim());

  return normalizeUniqueStrings(rawValues);
};

const matchKeywords = (keywords: string[], normalizedText: string) => {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeSearchText(keyword);

    if (normalizedKeyword && normalizedText.includes(normalizedKeyword)) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  return { matched, missing };
};

const sanitizeKeywordMatches = (keywords: string[], values: string[]) => {
  const allowed = new Map(
    keywords.map((keyword) => [normalizeSearchText(keyword), keyword] as const),
  );

  return normalizeUniqueStrings(values)
    .map((value) => allowed.get(normalizeSearchText(value)) ?? null)
    .filter((value): value is string => Boolean(value));
};

const getOpenAIClient = () => {
  if (openAiClient !== undefined) {
    return openAiClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  openAiClient = apiKey ? new OpenAI({ apiKey }) : null;
  return openAiClient;
};

const buildSummary = ({
  score,
  method,
  requiredMatched,
  requiredMissing,
  preferredMatched,
  preferredMissing,
  candidateSummary,
}: Pick<
  AtsEvaluation,
  | "score"
  | "method"
  | "requiredMatched"
  | "requiredMissing"
  | "preferredMatched"
  | "preferredMissing"
  | "candidateSummary"
>) => {
  if (score === null) {
    return "ATS is not configured for this job.";
  }

  const base = `${score}% match. Required ${requiredMatched.length}/${requiredMatched.length + requiredMissing.length}, preferred ${preferredMatched.length}/${preferredMatched.length + preferredMissing.length}.`;

  if (!candidateSummary.trim()) {
    return method === "ai" ? `${base} AI extracted the resume successfully.` : base;
  }

  return `${base} ${candidateSummary.trim()}`;
};

const getExtractedTextPreview = (value: string) => {
  return value.replace(/\s+/g, " ").trim().slice(0, 280);
};

const scoreAts = ({
  requiredMatched,
  requiredMissing,
  preferredMatched,
  preferredMissing,
}: Pick<
  AtsEvaluation,
  "requiredMatched" | "requiredMissing" | "preferredMatched" | "preferredMissing"
>) => {
  const requiredTotal = requiredMatched.length + requiredMissing.length;
  const preferredTotal = preferredMatched.length + preferredMissing.length;

  if (requiredTotal === 0 && preferredTotal === 0) {
    return null;
  }

  const requiredRatio = requiredTotal > 0 ? requiredMatched.length / requiredTotal : 1;
  const preferredRatio = preferredTotal > 0 ? preferredMatched.length / preferredTotal : 1;

  if (requiredTotal > 0 && preferredTotal > 0) {
    return Math.round(requiredRatio * 70 + preferredRatio * 30);
  }

  if (requiredTotal > 0) {
    return Math.round(requiredRatio * 100);
  }

  return Math.round(preferredRatio * 100);
};

const buildNoConfigEvaluation = (): AtsEvaluation => ({
  score: null,
  method: "none",
  summary: "ATS is not configured for this job.",
  candidateSummary: "",
  confidenceNotes: "",
  extractedTextPreview: "",
  normalizedSkills: [],
  relevantRoles: [],
  education: [],
  yearsOfExperience: null,
  requiredMatched: [],
  requiredMissing: [],
  preferredMatched: [],
  preferredMissing: [],
  evaluatedAt: null,
});

const buildRulesEvaluation = ({
  extractedText,
  requiredKeywords,
  preferredKeywords,
  summaryOverride,
}: {
  extractedText: string;
  requiredKeywords: string[];
  preferredKeywords: string[];
  summaryOverride?: string;
}): AtsEvaluation => {
  const normalizedText = normalizeSearchText(extractedText);
  const required = matchKeywords(requiredKeywords, normalizedText);
  const preferred = matchKeywords(preferredKeywords, normalizedText);
  const evaluation: AtsEvaluation = {
    score: scoreAts({
      requiredMatched: required.matched,
      requiredMissing: required.missing,
      preferredMatched: preferred.matched,
      preferredMissing: preferred.missing,
    }),
    method: "rules",
    summary: "",
    candidateSummary: summaryOverride ?? "",
    confidenceNotes: "",
    extractedTextPreview: getExtractedTextPreview(extractedText),
    normalizedSkills: [],
    relevantRoles: [],
    education: [],
    yearsOfExperience: null,
    requiredMatched: required.matched,
    requiredMissing: required.missing,
    preferredMatched: preferred.matched,
    preferredMissing: preferred.missing,
    evaluatedAt: new Date().toISOString(),
  };

  return {
    ...evaluation,
    summary: buildSummary(evaluation),
  };
};

const extractResumeText = async (resumeBuffer: Buffer) => {
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(pathToFileURL(pdfParseWorkerPath).toString());
  const parser = new PDFParse({ data: resumeBuffer });

  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
};

const analyzeWithAI = async ({
  extractedText,
  job,
  requiredKeywords,
  preferredKeywords,
}: {
  extractedText: string;
  job: Pick<JobRecord, "title" | "summary" | "requirements" | "department" | "experienceLevel">;
  requiredKeywords: string[];
  preferredKeywords: string[];
}) => {
  const client = getOpenAIClient();

  if (!client) {
    return null;
  }

  const model = process.env.ATS_OPENAI_MODEL || DEFAULT_ATS_MODEL;
  const truncatedResumeText = extractedText.slice(0, MAX_RESUME_TEXT_CHARS);

  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You are an ATS resume analysis engine.",
              "Extract a structured candidate profile from the resume text.",
              "Use the provided job context and keyword lists.",
              "Only mark a keyword as matched if the resume provides evidence for it.",
              "Normalize skills into concise technology or domain names.",
              "Do not invent experience or qualifications that are not present in the resume.",
            ].join(" "),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              job: {
                title: job.title,
                summary: job.summary,
                department: job.department,
                experienceLevel: job.experienceLevel,
                requirements: job.requirements,
                requiredKeywords,
                preferredKeywords,
              },
              resumeText: truncatedResumeText,
            }),
          },
        ],
      },
    ],
    text: {
      format: zodTextFormat(atsAnalysisSchema, "ats_resume_analysis"),
    },
  });

  return response.output_parsed;
};

export const evaluateResumeAgainstJob = async ({
  resumeBuffer,
  job,
}: {
  resumeBuffer: Buffer;
  job: Pick<
    JobRecord,
    | "title"
    | "summary"
    | "requirements"
    | "department"
    | "experienceLevel"
    | "atsEnabled"
    | "atsRequiredKeywords"
    | "atsPreferredKeywords"
  >;
}): Promise<AtsEvaluation> => {
  if (!job.atsEnabled) {
    return buildNoConfigEvaluation();
  }

  const requiredKeywords = parseAtsKeywordInput(job.atsRequiredKeywords);
  const preferredKeywords = parseAtsKeywordInput(job.atsPreferredKeywords);

  if (requiredKeywords.length === 0 && preferredKeywords.length === 0) {
    return buildNoConfigEvaluation();
  }

  try {
    const extractedText = await extractResumeText(resumeBuffer);

    if (!extractedText.trim()) {
      return buildRulesEvaluation({
        extractedText: "",
        requiredKeywords,
        preferredKeywords,
        summaryOverride: "Resume text could not be extracted cleanly.",
      });
    }

    try {
      const aiResult = await analyzeWithAI({
        extractedText,
        job,
        requiredKeywords,
        preferredKeywords,
      });

      if (aiResult) {
        const requiredMatched = sanitizeKeywordMatches(requiredKeywords, aiResult.matchedRequiredKeywords);
        const preferredMatched = sanitizeKeywordMatches(preferredKeywords, aiResult.matchedPreferredKeywords);
        const requiredMissing = requiredKeywords.filter((keyword) => !requiredMatched.includes(keyword));
        const preferredMissing = preferredKeywords.filter((keyword) => !preferredMatched.includes(keyword));

        const evaluation: AtsEvaluation = {
          score: scoreAts({
            requiredMatched,
            requiredMissing,
            preferredMatched,
            preferredMissing,
          }),
          method: "ai",
          summary: "",
          candidateSummary: aiResult.candidateSummary.trim(),
          confidenceNotes: aiResult.confidenceNotes.trim(),
          extractedTextPreview: getExtractedTextPreview(extractedText),
          normalizedSkills: normalizeUniqueStrings(aiResult.normalizedSkills),
          relevantRoles: normalizeUniqueStrings(aiResult.relevantRoles),
          education: normalizeUniqueStrings(aiResult.education),
          yearsOfExperience: typeof aiResult.yearsOfExperience === "number"
            ? aiResult.yearsOfExperience
            : null,
          requiredMatched,
          requiredMissing,
          preferredMatched,
          preferredMissing,
          evaluatedAt: new Date().toISOString(),
        };

        return {
          ...evaluation,
          summary: buildSummary(evaluation),
        };
      }
    } catch {
      // Fall back to deterministic keyword scoring when AI analysis is unavailable.
    }

    return buildRulesEvaluation({
      extractedText,
      requiredKeywords,
      preferredKeywords,
      summaryOverride: "Scored using rules-based keyword matching.",
    });
  } catch {
    return {
      ...buildRulesEvaluation({
        extractedText: "",
        requiredKeywords,
        preferredKeywords,
        summaryOverride: "ATS parsing failed for this CV. The application is still saved.",
      }),
      score: 0,
    };
  }
};
