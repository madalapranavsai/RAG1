import { pipeline } from "@huggingface/transformers";

let extractorInstance: any = null;

/**
 * Initializes and retrieves the local Transformers.js feature extraction pipeline.
 * Caches the instance in memory for fast reuse across requests.
 */
async function getExtractor() {
  if (!extractorInstance) {
    // Disables local files check to fetch from Hugging Face hub on first run,
    // then loads from local cache folder.
    extractorInstance = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return extractorInstance;
}

/**
 * Generates vector representations for an array of strings.
 *
 * @param texts Array of string inputs to embed.
 * @returns Promise containing a 2D array of floats.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const provider = process.env.EMBEDDING_PROVIDER || "local";

  if (provider === "openai") {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OpenAI API key (LLM_API_KEY) is not set in environment variables."
      );
    }
    const modelName = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: modelName,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `OpenAI Embeddings API error: ${response.status} - ${errText}`
      );
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }

  // Default: Local Hugging Face all-MiniLM-L6-v2 model (384 dimensions)
  const extractor = await getExtractor();
  const results: number[][] = [];

  for (const text of texts) {
    // Replace newlines with spaces to optimize formatting for MiniLM
    const cleanText = text.replace(/\n/g, " ").trim();
    if (!cleanText) {
      results.push(new Array(384).fill(0));
      continue;
    }

    const output = await extractor(cleanText, {
      pooling: "mean",
      normalize: true,
    });
    
    results.push(Array.from(output.data) as number[]);
  }

  return results;
}

/**
 * Generates a vector representation for a single string input.
 *
 * @param text The string content to embed.
 * @returns Promise containing a 1D array of floats.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const results = await generateEmbeddings([text]);
  return results[0];
}
