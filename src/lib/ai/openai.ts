import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  // Keep this as a console error, not a thrown error, to avoid crashing builds.
  console.error("Missing OPENAI_API_KEY");
}

export const openai = new OpenAI({ apiKey });
