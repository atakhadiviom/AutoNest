
'use server';
/**
 * @fileOverview A keyword suggestion agent that fetches data from an n8n webhook.
 *
 * - suggestKeywords - A function that handles the keyword suggestion process.
 * - KeywordSuggestionInput - The input type for the suggestKeywords function.
 * - KeywordSuggestionOutput - The return type for the suggestKeywords function.
 */

import {z} from 'genkit'; // Zod is still used for schema validation

const KeywordSuggestionInputSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters long."}).describe('The central topic or seed keyword for which suggestions are needed.'),
  language: z.string().optional().describe('The language for the keywords (e.g., "en", "es"). Defaults to English if not provided. (Note: n8n webhook may not use this)'),
  country: z.string().optional().describe('The target country for the keywords (e.g., "US", "GB"). Helps in generating region-specific suggestions. (Note: n8n webhook may not use this)'),
});
export type KeywordSuggestionInput = z.infer<typeof KeywordSuggestionInputSchema>;

const KeywordSuggestionOutputSchema = z.object({
  suggestions: z.array(z.object({
    keyword: z.string().describe("The suggested keyword."),
    potentialUse: z.string().describe("A brief explanation of why this keyword might be useful or in what context.").optional(),
    relevanceScore: z.number().min(0).max(1).optional().describe("An estimated relevance score from 0 (low) to 1 (high)."),
  })).describe('A list of keyword suggestions with potential uses and relevance scores.'),
});
export type KeywordSuggestionOutput = z.infer<typeof KeywordSuggestionOutputSchema>;

export async function suggestKeywords(input: KeywordSuggestionInput): Promise<KeywordSuggestionOutput> {
  const n8nWebhookBaseUrl = "https://n8n-service-g3uy.onrender.com/webhook/76a63718-b3cb-4141-bc55-efa614d13f1d";
  const encodedTopic = encodeURIComponent(input.topic);
  const fullUrl = `${n8nWebhookBaseUrl}?q=${encodedTopic}`;

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Error from n8n webhook: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`Failed to fetch keyword suggestions from n8n webhook. Status: ${response.status}. Please check the n8n service.`);
    }

    const data = await response.json();

    // Assuming n8n returns an array of objects like:
    // [{ "keyword": "kw1", "potentialUse": "...", "relevanceScore": 0.8 }, ...]
    // or simpler: [{ "keyword": "kw1" }, ...]
    // or even just an array of strings: ["kw1", "kw2"]
    let rawSuggestions: any[] = [];
    if (Array.isArray(data)) {
        rawSuggestions = data;
    } else if (typeof data === 'object' && data !== null && Array.isArray(data.suggestions)) {
        // Handle cases where suggestions might be nested under a 'suggestions' key
        rawSuggestions = data.suggestions;
    } else {
        console.warn("Unexpected data format from n8n webhook. Expected an array or object with a 'suggestions' array.", data);
        return { suggestions: [] };
    }
    

    const suggestions = rawSuggestions.map((item: any) => {
      if (typeof item === 'string') {
        return {
          keyword: item,
          potentialUse: undefined, // n8n webhook might not provide this
          relevanceScore: undefined, // n8n webhook might not provide this
        };
      }
      return {
        keyword: item.keyword || "Unknown keyword",
        potentialUse: item.potentialUse,
        relevanceScore: typeof item.relevanceScore === 'number' ? Math.min(1, Math.max(0, item.relevanceScore)) : undefined,
      };
    });
    
    // Validate the output against the schema (optional, but good practice)
    const validationResult = KeywordSuggestionOutputSchema.safeParse({ suggestions });
    if (!validationResult.success) {
        console.error("Validation error for n8n output:", validationResult.error.flatten());
        throw new Error("Received invalid data format from n8n webhook after mapping.");
    }

    return { suggestions: validationResult.data.suggestions };

  } catch (error) {
    console.error("Error calling n8n keyword suggestion webhook:", error);
    if (error instanceof Error) {
      throw new Error(`Could not retrieve keyword suggestions: ${error.message}`);
    }
    throw new Error("An unknown error occurred while retrieving keyword suggestions.");
  }
}
