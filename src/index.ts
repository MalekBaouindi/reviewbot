import { Probot, run } from "probot";
import { config } from "./config";
import { reviewPullRequest } from "./services/pipeline";
import { GroqClient } from "./llm/client";
import { ReviewDebouncer } from "./utils/debounce";
import { addWebRoutes } from "./web/routes";
import type { ApplicationFunctionOptions } from "probot";

const groq = new GroqClient();
const debouncer = new ReviewDebouncer();

async function handlePullRequest(context: any): Promise<void> {
  const pr = context.payload.pull_request;

  if (!pr) {
    context.log.warn("No pull_request payload found");
    return;
  }

  const { owner, repo } = context.repo();
  const ownerName = owner.login ?? owner;
  const debounceKey = `${ownerName}/${repo}#${pr.number}`;

  if (!debouncer.canProceed(debounceKey)) {
    context.log.info(`PR #${pr.number}: debounced (skipping duplicate)`);
    return;
  }

  context.log.info(`Reviewing PR #${pr.number} on ${ownerName}/${repo}`);

  const headSha = pr.head?.sha;

  try {
    await reviewPullRequest(
      {
        octokit: context.octokit,
        groq,
        logger: context.log,
      },
      ownerName,
      repo,
      pr.number,
      headSha
    );
  } catch (err) {
    context.log.error(
      `Review failed for PR #${pr.number}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export = (app: Probot, options?: Partial<ApplicationFunctionOptions>) => {
  app.log.info(`ReviewBot v1.0.0 starting (model: ${config.model}, port: ${config.port})`);

  const getRouter = options?.getRouter;
  if (getRouter) {
    const router = getRouter("/");
    addWebRoutes(router);
    app.log.info("Web routes registered (stats, badge, dashboard)");
  }

  app.on("pull_request.opened", handlePullRequest);
  app.on("pull_request.synchronize", handlePullRequest);
};

if (require.main === module) {
  run(require("./index") as Parameters<typeof run>[0]).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start ReviewBot:", err);
    process.exit(1);
  });
}