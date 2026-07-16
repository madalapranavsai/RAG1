export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Sends a chat completion query to the configured LLM API (OpenAI).
 *
 * @param messages Thread of message objects containing role and content.
 * @returns Promise containing the generated reply content and token usage statistics.
 */
export async function generateChatCompletion(
  messages: { role: string; content: string }[]
): Promise<LLMResponse> {
  const provider = process.env.LLM_PROVIDER || "openai";
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error(
      "LLM API Key (LLM_API_KEY) is not defined in your environment variables. Please check your .env.local configuration."
    );
  }

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.3, // Lower temperature to improve retrieval accuracy and reduce hallucinations
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `OpenAI Chat Completion API error: ${response.status} - ${errText}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const usage = data.usage;

    return { content, usage };
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}
