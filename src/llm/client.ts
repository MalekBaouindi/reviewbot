import OpenAI from "openai";
import { config } from "../config";
import { withRetry } from "../utils/retry";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export class GroqClient {
  private client: OpenAI;

  constructor(apiKey: string = config.groqApiKey, private model: string = config.model) {
    this.client = new OpenAI({
      apiKey,
      baseURL: GROQ_BASE_URL,
    });
  }

  async analyzeDiff(prompt: string): Promise<string> {
    return withRetry(
      async () => {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are an expert code reviewer. Analyze the pull request diff and respond with strict JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Groq returned empty response");
        }

        return content;
      },
      {
        shouldRetry: (err) => {
          if (err instanceof OpenAI.APIError) {
            if (err.status === 429 || err.status >= 500) return true;
          }
          return false;
        },
      }
    );
  }
}