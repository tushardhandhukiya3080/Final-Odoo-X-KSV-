// Local sentence-embeddings via Transformers.js — no API key, no external
// service, runs on CPU. Model downloads once (~90MB) then caches on disk.
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIM = 384;

// pipeline() is heavily overloaded; TS can't represent the resulting union.
// Narrow it to just the signature we use.
const createPipeline = pipeline as unknown as (
  task: "feature-extraction",
  model: string,
) => Promise<FeatureExtractionPipeline>;

// Load the model once and reuse it (survives dev hot reloads).
const globalForEmb = globalThis as unknown as {
  embedder?: Promise<FeatureExtractionPipeline>;
};

function getEmbedder(): Promise<FeatureExtractionPipeline> {
  globalForEmb.embedder ??= createPipeline("feature-extraction", MODEL);
  return globalForEmb.embedder;
}

export async function embed(text: string): Promise<number[]> {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

// pgvector accepts a "[0.1,0.2,...]" text literal for a vector column.
export function toVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
