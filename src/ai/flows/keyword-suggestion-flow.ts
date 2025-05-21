
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
});
export type KeywordSuggestionInput = z.infer<typeof KeywordSuggestionInputSchema>;

const KeywordSuggestionOutputSchema = z.object({
  suggestions: z.array(z.object({
    keyword: z.string().describe("The suggested keyword."),
    potentialUse: z.string().describe("A brief explanation of why this keyword might be useful or in what context.").optional(),
    relevanceScore: z.number().min(0).max(1).optional().describe("An estimated relevance score from 0 (low) to 1 (high)."),
  })).describe('A list of keyword suggestions with potential uses and relevance scores.'),
  rawResponse: z.string().optional().describe('The raw JSON response from the n8n webhook for debugging.'),
});
export type KeywordSuggestionOutput = z.infer<typeof KeywordSuggestionOutputSchema>;

export async function suggestKeywords(input: KeywordSuggestionInput): Promise<KeywordSuggestionOutput> {
  const n8nWebhookBaseUrl = "https://n8n-service-g3uy.onrender.com/webhook/76a63718-b3cb-4141-bc55-efa614d13f1d";
  const encodedTopic = encodeURIComponent(input.topic);
  const fullUrl = `${n8nWebhookBaseUrl}?q=${encodedTopic}`;

  console.log(`[Keyword Suggestion Flow] Requesting URL: ${fullUrl}`);
  let rawResponseText = '';

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    rawResponseText = await response.text(); // Get raw text first

    if (!response.ok) {
      console.error(`[Keyword Suggestion Flow] Error from n8n webhook: ${response.status} ${response.statusText}`, rawResponseText);
      throw new Error(`Failed to fetch keyword suggestions from n8n webhook. Status: ${response.status}. Please check the n8n service.`);
    }
    
    const data = JSON.parse(rawResponseText); // Parse after ensuring it's ok
    console.log("[Keyword Suggestion Flow] Data from n8n webhook:", JSON.stringify(data, null, 2));

    let rawSuggestions: any[] = [];
    if (Array.isArray(data)) {
        rawSuggestions = data; // Handles cases like: [{keyword: "kw1"}, "kw2"]
    } else if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data.suggestions)) { // Handles { suggestions: [...] }
            rawSuggestions = data.suggestions;
        } else if (Array.isArray(data.Keywords)) { // Handles { Keywords: ["kw1", "kw2"] }
            // Map string array to the expected object structure for unified processing
            rawSuggestions = data.Keywords.map((kw: any) => ({ keyword: String(kw) }));
        } else {
            console.warn("[Keyword Suggestion Flow] Unexpected object data format from n8n webhook. Expected 'suggestions' or 'Keywords' array. Data:", data);
            return { suggestions: [], rawResponse: rawResponseText };
        }
    } else {
        console.warn("[Keyword Suggestion Flow] Unexpected data format from n8n webhook. Expected an array or an object. Data:", data);
        return { suggestions: [], rawResponse: rawResponseText };
    }
    
    const suggestions = rawSuggestions.map((item: any) => {
      if (typeof item === 'string') { // If item from rawSuggestions is just a string (e.g. from a direct array of strings if n8n changes)
        return {
          keyword: item,
          potentialUse: undefined, 
          relevanceScore: undefined, 
        };
      }
      // If item is an object (e.g., from data.Keywords.map or if webhook sent full objects)
      return {
        keyword: String(item.keyword || "Unknown keyword"), // Ensure keyword is a string
        potentialUse: item.potentialUse ? String(item.potentialUse) : undefined, // Ensure potentialUse is a string if present
        relevanceScore: typeof item.relevanceScore === 'number' ? Math.min(1, Math.max(0, item.relevanceScore)) : undefined,
      };
    });
    
    const validationResult = KeywordSuggestionOutputSchema.safeParse({ suggestions, rawResponse: rawResponseText });
    if (!validationResult.success) {
        console.error("[Keyword Suggestion Flow] Validation error for n8n output:", validationResult.error.flatten());
        // Return empty suggestions but keep rawResponse for debugging
        return { suggestions: [], rawResponse: rawResponseText };
    }
    
    console.log("[Keyword Suggestion Flow] Parsed suggestions count:", validationResult.data.suggestions.length);
    return { suggestions: validationResult.data.suggestions, rawResponse: rawResponseText };

  } catch (error) {
    console.error("[Keyword Suggestion Flow] Error calling n8n keyword suggestion webhook:", error);
    if (error instanceof Error) {
      return { suggestions: [], rawResponse: rawResponseText || `Error: ${error.message}` };
    }
    return { suggestions: [], rawResponse: rawResponseText || "An unknown error occurred." };
  }
}
