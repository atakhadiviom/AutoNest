
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
  const n8nWebhookBaseUrl = "https://n8n.autonest.site/webhook/76a63718-b3cb-4141-bc55-efa614d13f1d";
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

    rawResponseText = await response.text(); 

    if (!response.ok) {
      console.error(`[Keyword Suggestion Flow] Error from n8n webhook: ${response.status} ${response.statusText}`, rawResponseText);
      return { 
        suggestions: [], 
        rawResponse: `Error ${response.status} ${response.statusText}. Response: ${rawResponseText || "N/A"}` 
      };
    }
    
    const data = JSON.parse(rawResponseText); 
    console.log("[Keyword Suggestion Flow] Data from n8n webhook:", JSON.stringify(data, null, 2));

    let rawSuggestions: any[] = [];
    if (Array.isArray(data)) {
        rawSuggestions = data; 
    } else if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data.suggestions)) { 
            rawSuggestions = data.suggestions;
        } else if (Array.isArray(data.Keywords)) { 
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
      if (typeof item === 'string') { 
        return {
          keyword: item,
          potentialUse: undefined, 
          relevanceScore: undefined, 
        };
      }
      return {
        keyword: String(item.keyword || "Unknown keyword"), 
        potentialUse: item.potentialUse ? String(item.potentialUse) : undefined, 
        relevanceScore: typeof item.relevanceScore === 'number' ? Math.min(1, Math.max(0, item.relevanceScore)) : undefined,
      };
    });
    
    const validationResult = KeywordSuggestionOutputSchema.safeParse({ suggestions, rawResponse: rawResponseText });
    if (!validationResult.success) {
        console.error("[Keyword Suggestion Flow] Validation error for n8n output:", validationResult.error.flatten());
        return { suggestions: [], rawResponse: `Validation Error: ${validationResult.error.message}. Raw Data: ${rawResponseText}` };
    }
    
    console.log("[Keyword Suggestion Flow] Parsed suggestions count:", validationResult.data.suggestions.length);
    return { suggestions: validationResult.data.suggestions, rawResponse: rawResponseText };

  } catch (error) {
    console.error("[Keyword Suggestion Flow] Error in keyword suggestion process:", error);
    let detail = "No specific error message identified.";
    if (error instanceof Error) {
      detail = error.message;
    } else if (typeof error === 'string') {
      detail = error;
    } else if (error && typeof error.toString === 'function') {
      detail = error.toString();
    }
    const responseInfo = rawResponseText ? `Raw Response Text: ${rawResponseText}` : "Raw response text not available (error might have occurred before or during fetching response body).";
    return { 
        suggestions: [], 
        rawResponse: `Keyword suggestion failed. Detail: ${detail}. ${responseInfo}`
    };
  }
}
