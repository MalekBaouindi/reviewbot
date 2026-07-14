import type { ProbotOctokit } from "probot";
import { fetchDiff, extractValidLines, fetchReviewbotIgnore } from "../github/diff";
import { publishReview } from "../github/review";
import { GroqClient } from "../llm/client";
import { buildPrompt } from "../llm/prompt";
import { parseReviewResponse } from "../llm/parser";
import { batchChunks } from "../llm/chunker";
import { buildFileContextMap, type FileContext } from "../github/context";
import { recordReview } from "../db/stats";
import type { ReviewResult, Finding, DiffChunk } from "../types";

export interface PipelineDeps {
  octokit: ProbotOctokit;
  groq: GroqClient;
  logger: { info(msg: string): void; warn(msg: string): void; error(msg: string): void };
}

function isParseFallback(result: ReviewResult): boolean {
  return result.findings.length === 0 && result.summary === "Could not parse review response from model.";
}

async function analyzeBatch(
  groq: GroqClient,
  batch: DiffChunk[],
  contextMap?: Map<string, FileContext>
): Promise<ReviewResult> {
  const prompt = buildPrompt(batch, contextMap);
  const raw = await groq.analyzeDiff(prompt);
  const result = parseReviewResponse(raw);

  if (isParseFallback(result)) {
    const retryRaw = await groq.analyzeDiff(prompt);
    return parseReviewResponse(retryRaw);
  }

  return result;
}

export async function reviewPullRequest(
  deps: PipelineDeps,
  owner: string,
  repo: string,
  pullNumber: number,
  headSha?: string
): Promise<void> {
  const { octokit, groq, logger } = deps;

  const ignorePatterns = await fetchReviewbotIgnore(octokit, owner, repo);
  const chunks = await fetchDiff(octokit, owner, repo, pullNumber, ignorePatterns);

  if (chunks.length === 0) {
    logger.info(`PR #${pullNumber}: no reviewable files`);
    return;
  }

  const validLines = extractValidLines(chunks);
  const batches = batchChunks(chunks);

  let contextMap: Map<string, FileContext> | undefined;
  if (headSha) {
    contextMap = await buildFileContextMap(octokit, owner, repo, headSha, chunks, validLines);
  }

  logger.info(`PR #${pullNumber}: ${chunks.length} file(s) in ${batches.length} batch(es)`);

  let allFindings: Finding[] = [];
  let finalSummary = "";

  for (let i = 0; i < batches.length; i++) {
    const batchFiles = new Set(batches[i].map(c => c.filename));
    const batchCtx = contextMap
      ? new Map(Array.from(contextMap.entries()).filter(([name]) => batchFiles.has(name)))
      : undefined;

    const result = await analyzeBatch(groq, batches[i], batchCtx);
    allFindings = allFindings.concat(result.findings);
    finalSummary = result.summary;
  }

  const merged: ReviewResult = {
    findings: allFindings,
    summary: batches.length > 1
      ? `Reviewed across ${batches.length} batches. ${finalSummary}`
      : finalSummary,
  };

  await publishReview(octokit, owner, repo, pullNumber, merged, validLines);

  try {
    recordReview(`${owner}/${repo}`, pullNumber, merged.findings);
  } catch (err) {
    logger.warn(
      `Failed to record review stats: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  logger.info(`PR #${pullNumber}: review published (${merged.findings.length} finding(s) across ${batches.length} batch(es))`);
}