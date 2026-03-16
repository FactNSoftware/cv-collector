import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { z } from "zod";
import { hasEffectiveAtsCriteria, type JobRecord } from "./jobs";

const DEFAULT_ATS_MODEL = "gpt-4o-mini";
const MAX_RESUME_TEXT_CHARS = 20_000;

let openAiClient: OpenAI | null | undefined;
const getPdfParseWorkerPath = () => {
  const candidates = [
    path.resolve(process.cwd(), "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs"),
    path.resolve(process.cwd(), "node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs"),
    path.resolve(process.cwd(), "node_modules/pdf-parse/dist/pdf-parse/web/pdf.worker.mjs"),
    path.resolve(process.cwd(), "node_modules/pdf-parse/dist/node/esm/pdf.worker.mjs"),
    path.resolve(process.cwd(), "node_modules/pdf-parse/dist/node/cjs/pdf.worker.mjs"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to locate pdf-parse worker file in runtime bundle.");
};

const atsAnalysisSchema = z.object({
  candidateSummary: z.string().default(""),
  normalizedSkills: z.array(z.string()).default([]),
  relevantRoles: z.array(z.string()).default([]),
  education: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  domains: z.array(z.string()).default([]),
  seniority: z.string().default(""),
  yearsOfExperience: z.number().nullable().default(null),
  confidenceScore: z.number().nullable().default(null),
  matchedRequiredKeywords: z.array(z.string()).default([]),
  missingRequiredKeywords: z.array(z.string()).default([]),
  matchedPreferredKeywords: z.array(z.string()).default([]),
  missingPreferredKeywords: z.array(z.string()).default([]),
  confidenceNotes: z.string().default(""),
});

export type AtsEvaluation = {
  score: number | null;
  method: "ai" | "rules" | "none";
  decisionBand: "best_match" | "strong_match" | "qualified" | "needs_review" | "low_match" | "not_scored";
  summary: string;
  candidateSummary: string;
  confidenceNotes: string;
  extractedTextPreview: string;
  normalizedSkills: string[];
  relevantRoles: string[];
  education: string[];
  certifications: string[];
  domains: string[];
  seniority: string;
  confidenceScore: number | null;
  yearsOfExperience: number | null;
  experienceRequirementMet: boolean | null;
  educationRequirementMet: boolean | null;
  certificationRequirementMet: boolean | null;
  requiredMatched: string[];
  requiredMissing: string[];
  preferredMatched: string[];
  preferredMissing: string[];
  evaluatedAt: string | null;
};

const normalizeKeyword = (value: string) => {
  return value.trim().replace(/\s+/g, " ");
};

const NORMALIZED_TERM_PATTERNS: Array<[RegExp, string]> = [
  [/\breact(?:\.js| js|js)?\b/gi, "react"],
  [/\bnext(?:\.js| js|js)?\b/gi, "nextjs"],
  [/\bnode(?:\.js| js|js)?\b/gi, "nodejs"],
  [/\bjava\s*script\b/gi, "javascript"],
  [/\bjs\b/gi, "javascript"],
  [/\btype\s*script\b/gi, "typescript"],
  [/\bts\b/gi, "typescript"],
  [/\brest(?:ful)?\s+apis?\b/gi, "rest api"],
  [/\brestful\b/gi, "rest api"],
  [/\bapis?\b/gi, "api"],
  [/\bgraph\s*ql\b/gi, "graphql"],
  [/\bci\s*\/?\s*cd\b/gi, "ci cd"],
  [/\baws\b|\bamazon web services\b/gi, "aws"],
  [/\bmicrosoft azure\b|\bazure cloud\b/gi, "azure"],
  [/\bdocker containers?\b/gi, "docker"],
  [/\bmaterial\s*ui\b|\bmui\b/gi, "material ui"],
  [/\btailwind\s*css\b/gi, "tailwind css"],
  [/\bhtml\b/gi, "html5"],
  [/\bcss\b/gi, "css3"],
  [/\bagile\s*\/\s*scrum\b|\bscrum\b/gi, "agile scrum"],
  [/\bfrontend\b/gi, "frontend"],
  [/\bfront end\b/gi, "frontend"],
  [/\bbackend\b/gi, "backend"],
  [/\bback end\b/gi, "backend"],
  [/\bui\b/gi, "user interface"],
  [/\bux\b/gi, "user experience"],
  [/\bcomponent[-\s]+based architecture\b/gi, "component based architecture"],
  [/\bresponsive ui\b/gi, "responsive design"],
];

const normalizeSearchText = (value: string) => {
  let normalized = value
    .toLowerCase()
    .replace(/[()_,;:|[\]{}]+/g, " ")
    .replace(/[.&]/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of NORMALIZED_TERM_PATTERNS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.replace(/\s+/g, " ").trim();
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

const normalizeOptionalMinimumYears = (value: number | null | undefined) => {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
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
  decisionBand,
  requiredMatched,
  requiredMissing,
  preferredMatched,
  preferredMissing,
  candidateSummary,
  experienceRequirementMet,
  educationRequirementMet,
  certificationRequirementMet,
}: Pick<
  AtsEvaluation,
  | "score"
  | "method"
  | "decisionBand"
  | "requiredMatched"
  | "requiredMissing"
  | "preferredMatched"
  | "preferredMissing"
  | "candidateSummary"
  | "experienceRequirementMet"
  | "educationRequirementMet"
  | "certificationRequirementMet"
>) => {
  if (score === null) {
    return "ATS is not configured for this job.";
  }

  const checks: string[] = [];
  if (experienceRequirementMet !== null) {
    checks.push(`experience ${experienceRequirementMet ? "met" : "not met"}`);
  }
  if (educationRequirementMet !== null) {
    checks.push(`education ${educationRequirementMet ? "met" : "not met"}`);
  }
  if (certificationRequirementMet !== null) {
    checks.push(`certifications ${certificationRequirementMet ? "met" : "not met"}`);
  }

  const base = `${score}% match. ${decisionBand.replace(/_/g, " ")}. Required ${requiredMatched.length}/${requiredMatched.length + requiredMissing.length}, preferred ${preferredMatched.length}/${preferredMatched.length + preferredMissing.length}.${checks.length > 0 ? ` ${checks.join(", ")}.` : ""}`;

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
  experienceRequirementMet,
  educationRequirementMet,
  certificationRequirementMet,
}: Pick<
  AtsEvaluation,
  | "requiredMatched"
  | "requiredMissing"
  | "preferredMatched"
  | "preferredMissing"
  | "experienceRequirementMet"
  | "educationRequirementMet"
  | "certificationRequirementMet"
>) => {
  const requiredTotal = requiredMatched.length + requiredMissing.length;
  const preferredTotal = preferredMatched.length + preferredMissing.length;
  const hardRequirementChecks = [
    experienceRequirementMet,
    educationRequirementMet,
    certificationRequirementMet,
  ].filter((value): value is boolean => value !== null);

  if (requiredTotal === 0 && preferredTotal === 0 && hardRequirementChecks.length === 0) {
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

  if (hardRequirementChecks.length > 0) {
    const metChecks = hardRequirementChecks.filter(Boolean).length;
    return Math.round((metChecks / hardRequirementChecks.length) * 100);
  }

  return Math.round(preferredRatio * 100);
};

const buildNoConfigEvaluation = (): AtsEvaluation => ({
  score: null,
  method: "none",
  decisionBand: "not_scored",
  summary: "ATS is not configured for this job.",
  candidateSummary: "",
  confidenceNotes: "",
  extractedTextPreview: "",
  normalizedSkills: [],
  relevantRoles: [],
  education: [],
  certifications: [],
  domains: [],
  seniority: "",
  confidenceScore: null,
  yearsOfExperience: null,
  experienceRequirementMet: null,
  educationRequirementMet: null,
  certificationRequirementMet: null,
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
  minimumYearsExperience,
  requiredEducation,
  requiredCertifications,
  summaryOverride,
}: {
  extractedText: string;
  requiredKeywords: string[];
  preferredKeywords: string[];
  minimumYearsExperience: number | null;
  requiredEducation: string[];
  requiredCertifications: string[];
  summaryOverride?: string;
}): AtsEvaluation => {
  const deterministicSignals = getDeterministicSignals({
    extractedText,
    requiredKeywords,
    preferredKeywords,
    minimumYearsExperience,
    requiredEducation,
    requiredCertifications,
  });
  const evaluation: AtsEvaluation = {
    score: deterministicSignals.score,
    method: "rules",
    decisionBand: getAtsDecisionBand({
      score: deterministicSignals.score,
      requiredMissing: deterministicSignals.requiredMissing,
      experienceRequirementMet: deterministicSignals.experienceRequirementMet,
      educationRequirementMet: deterministicSignals.educationRequirementMet,
      certificationRequirementMet: deterministicSignals.certificationRequirementMet,
    }),
    summary: "",
    candidateSummary: summaryOverride ?? "",
    confidenceNotes: "",
    extractedTextPreview: getExtractedTextPreview(extractedText),
    normalizedSkills: [],
    relevantRoles: [],
    education: [],
    certifications: [],
    domains: [],
    seniority: "",
    confidenceScore: null,
    yearsOfExperience: deterministicSignals.yearsOfExperience,
    experienceRequirementMet: deterministicSignals.experienceRequirementMet,
    educationRequirementMet: deterministicSignals.educationRequirementMet,
    certificationRequirementMet: deterministicSignals.certificationRequirementMet,
    requiredMatched: deterministicSignals.requiredMatched,
    requiredMissing: deterministicSignals.requiredMissing,
    preferredMatched: deterministicSignals.preferredMatched,
    preferredMissing: deterministicSignals.preferredMissing,
    evaluatedAt: new Date().toISOString(),
  };

  return {
    ...evaluation,
    summary: buildSummary(evaluation),
  };
};

const getDeterministicKeywordEvaluation = ({
  extractedText,
  requiredKeywords,
  preferredKeywords,
  minimumYearsExperience,
  requiredEducation,
  requiredCertifications,
}: {
  extractedText: string;
  requiredKeywords: string[];
  preferredKeywords: string[];
  minimumYearsExperience: number | null;
  requiredEducation: string[];
  requiredCertifications: string[];
}) => {
  const normalizedText = normalizeSearchText(extractedText);
  const required = matchKeywords(requiredKeywords, normalizedText);
  const preferred = matchKeywords(preferredKeywords, normalizedText);
  const education = matchKeywords(requiredEducation, normalizedText);
  const certifications = matchKeywords(requiredCertifications, normalizedText);
  const yearsOfExperience = detectYearsOfExperienceFromText(extractedText);

  return {
    requiredMatched: required.matched,
    requiredMissing: required.missing,
    preferredMatched: preferred.matched,
    preferredMissing: preferred.missing,
    educationMatched: education.matched,
    educationMissing: education.missing,
    certificationsMatched: certifications.matched,
    certificationsMissing: certifications.missing,
    yearsOfExperience,
    experienceRequirementMet: minimumYearsExperience === null
      ? null
      : yearsOfExperience === null
        ? false
        : yearsOfExperience >= minimumYearsExperience,
    educationRequirementMet: requiredEducation.length === 0 ? null : education.missing.length === 0,
    certificationRequirementMet: requiredCertifications.length === 0 ? null : certifications.missing.length === 0,
    score: scoreAts({
      requiredMatched: required.matched,
      requiredMissing: required.missing,
      preferredMatched: preferred.matched,
      preferredMissing: preferred.missing,
      experienceRequirementMet: minimumYearsExperience === null
        ? null
        : yearsOfExperience === null
          ? false
          : yearsOfExperience >= minimumYearsExperience,
      educationRequirementMet: requiredEducation.length === 0 ? null : education.missing.length === 0,
      certificationRequirementMet: requiredCertifications.length === 0 ? null : certifications.missing.length === 0,
    }),
  };
};

const detectYearsOfExperienceFromText = (value: string) => {
  const matches = [...value.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi)]
    .map((match) => Number(match[1]))
    .filter((item) => Number.isFinite(item));

  if (matches.length === 0) {
    return null;
  }

  return Math.max(...matches);
};

const getAtsDecisionBand = ({
  score,
  requiredMissing,
  experienceRequirementMet,
  educationRequirementMet,
  certificationRequirementMet,
}: {
  score: number | null;
  requiredMissing: string[];
  experienceRequirementMet: boolean | null;
  educationRequirementMet: boolean | null;
  certificationRequirementMet: boolean | null;
}): AtsEvaluation["decisionBand"] => {
  if (score === null) {
    return "not_scored";
  }

  const hardRequirementFailed = requiredMissing.length > 0
    || experienceRequirementMet === false
    || educationRequirementMet === false
    || certificationRequirementMet === false;

  if (hardRequirementFailed) {
    return score >= 70 ? "needs_review" : "low_match";
  }

  if (score >= 85) {
    return "best_match";
  }

  if (score >= 70) {
    return "strong_match";
  }

  if (score >= 55) {
    return "qualified";
  }

  return "needs_review";
};

const getDeterministicSignals = ({
  extractedText,
  requiredKeywords,
  preferredKeywords,
  minimumYearsExperience,
  requiredEducation,
  requiredCertifications,
}: {
  extractedText: string;
  requiredKeywords: string[];
  preferredKeywords: string[];
  minimumYearsExperience: number | null;
  requiredEducation: string[];
  requiredCertifications: string[];
}) => getDeterministicKeywordEvaluation({
  extractedText,
  requiredKeywords,
  preferredKeywords,
  minimumYearsExperience,
  requiredEducation,
  requiredCertifications,
});

const extractResumeText = async (resumeBuffer: Buffer) => {
  const { PDFParse } = await import("pdf-parse");
  PDFParse.setWorker(pathToFileURL(getPdfParseWorkerPath()).toString());
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
  job: Pick<
    JobRecord,
    | "title"
    | "summary"
    | "requirements"
    | "department"
    | "experienceLevel"
    | "atsMinimumYearsExperience"
    | "atsRequiredEducation"
    | "atsRequiredCertifications"
  >;
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
              "Extract certifications, industries/domains, and seniority when the resume supports them.",
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
                minimumYearsExperience: normalizeOptionalMinimumYears(job.atsMinimumYearsExperience),
                requiredEducation: job.atsRequiredEducation,
                requiredCertifications: job.atsRequiredCertifications,
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
    | "atsMinimumYearsExperience"
    | "atsRequiredEducation"
    | "atsRequiredCertifications"
  >;
}): Promise<AtsEvaluation> => {
  if (!job.atsEnabled) {
    console.info("[ATS] Skipping evaluation because ATS is disabled for this job.", {
      title: job.title,
    });
    return buildNoConfigEvaluation();
  }

  const requiredKeywords = parseAtsKeywordInput(job.atsRequiredKeywords);
  const preferredKeywords = parseAtsKeywordInput(job.atsPreferredKeywords);
  const requiredEducation = parseAtsKeywordInput(job.atsRequiredEducation);
  const requiredCertifications = parseAtsKeywordInput(job.atsRequiredCertifications);
  const minimumYearsExperience = normalizeOptionalMinimumYears(job.atsMinimumYearsExperience);

  if (!hasEffectiveAtsCriteria(job)) {
    console.warn("[ATS] Skipping evaluation because the job has ATS enabled but no effective ATS criteria.", {
      title: job.title,
    });
    return buildNoConfigEvaluation();
  }

  try {
    console.info("[ATS] Starting evaluation.", {
      title: job.title,
      requiredKeywordCount: requiredKeywords.length,
      preferredKeywordCount: preferredKeywords.length,
      requiredEducationCount: requiredEducation.length,
      requiredCertificationCount: requiredCertifications.length,
      minimumYearsExperience,
      resumeBytes: resumeBuffer.byteLength,
      hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.ATS_OPENAI_MODEL || "gpt-4o-mini",
    });

    const extractedText = await extractResumeText(resumeBuffer);
    const deterministicEvaluation = getDeterministicKeywordEvaluation({
      extractedText,
      requiredKeywords,
      preferredKeywords,
      minimumYearsExperience,
      requiredEducation,
      requiredCertifications,
    });

    if (!extractedText.trim()) {
      return buildRulesEvaluation({
        extractedText: "",
        requiredKeywords,
        preferredKeywords,
        minimumYearsExperience,
        requiredEducation,
        requiredCertifications,
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
        const evaluation: AtsEvaluation = {
          score: deterministicEvaluation.score,
          method: "ai",
          decisionBand: getAtsDecisionBand({
            score: deterministicEvaluation.score,
            requiredMissing: deterministicEvaluation.requiredMissing,
            experienceRequirementMet: deterministicEvaluation.experienceRequirementMet,
            educationRequirementMet: deterministicEvaluation.educationRequirementMet,
            certificationRequirementMet: deterministicEvaluation.certificationRequirementMet,
          }),
          summary: "",
          candidateSummary: aiResult.candidateSummary.trim(),
          confidenceNotes: aiResult.confidenceNotes.trim(),
          extractedTextPreview: getExtractedTextPreview(extractedText),
          normalizedSkills: normalizeUniqueStrings(aiResult.normalizedSkills),
          relevantRoles: normalizeUniqueStrings(aiResult.relevantRoles),
          education: normalizeUniqueStrings(aiResult.education),
          certifications: normalizeUniqueStrings(aiResult.certifications),
          domains: normalizeUniqueStrings(aiResult.domains),
          seniority: aiResult.seniority.trim(),
          confidenceScore: typeof aiResult.confidenceScore === "number"
            ? Math.max(0, Math.min(100, Math.round(aiResult.confidenceScore)))
            : null,
          yearsOfExperience: typeof aiResult.yearsOfExperience === "number"
            ? aiResult.yearsOfExperience
            : deterministicEvaluation.yearsOfExperience,
          experienceRequirementMet: deterministicEvaluation.experienceRequirementMet,
          educationRequirementMet: deterministicEvaluation.educationRequirementMet,
          certificationRequirementMet: deterministicEvaluation.certificationRequirementMet,
          requiredMatched: deterministicEvaluation.requiredMatched,
          requiredMissing: deterministicEvaluation.requiredMissing,
          preferredMatched: deterministicEvaluation.preferredMatched,
          preferredMissing: deterministicEvaluation.preferredMissing,
          evaluatedAt: new Date().toISOString(),
        };

        return {
          ...evaluation,
          summary: buildSummary(evaluation),
        };
      }
    } catch {
      console.warn("[ATS] AI analysis failed; falling back to deterministic rules.");
      // Fall back to deterministic keyword scoring when AI analysis is unavailable.
    }

    return buildRulesEvaluation({
      extractedText,
      requiredKeywords,
      preferredKeywords,
      minimumYearsExperience,
      requiredEducation,
      requiredCertifications,
      summaryOverride: "Scored using rules-based keyword matching.",
    });
  } catch (error) {
    console.error("[ATS] Evaluation failed during resume parsing or analysis.", error);
    return {
      ...buildRulesEvaluation({
        extractedText: "",
        requiredKeywords,
        preferredKeywords,
        minimumYearsExperience,
        requiredEducation,
        requiredCertifications,
        summaryOverride: "ATS parsing failed for this CV. The application is still saved.",
      }),
      score: 0,
    };
  }
};
