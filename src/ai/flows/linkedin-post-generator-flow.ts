
'use server';
/**
 * @fileOverview An AI agent that generates LinkedIn posts by calling an n8n webhook.
 *
 * - generateLinkedInPost - A function that handles the LinkedIn post generation process.
 * - LinkedInPostGeneratorInput - The input type for the generateLinkedInPost function.
 * - LinkedInPostGeneratorOutput - The return type for the generateLinkedInPost function.
 */

import { z } from 'genkit';
import type { LinkedInPostGeneratorOutput as LinkedInPostGeneratorOutputType } from '@/lib/types';


const LinkedInPostGeneratorInputSchema = z.object({
  keyword: z.string().optional().describe('An optional keyword to guide the post generation.'),
});
export type LinkedInPostGeneratorInput = z.infer<typeof LinkedInPostGeneratorInputSchema>;

const LinkedInPostGeneratorOutputSchema = z.object({
  postText: z.string().describe("The generated text content for the LinkedIn post."),
  suggestedImagePrompt: z.string().optional().describe("An optional prompt suggestion for an accompanying image."),
  hashtags: z.array(z.string()).optional().describe("An optional list of suggested hashtags."),
});
export type LinkedInPostGeneratorOutput = z.infer<typeof LinkedInPostGeneratorOutputSchema>;


export async function generateLinkedInPost(
  input: LinkedInPostGeneratorInput
): Promise<LinkedInPostGeneratorOutputType> {
  const n8nWebhookUrl = "https://n8n.autonest.site/webhook/generate-linkedin-post";
  let rawResponseText = '';
  let detail = "An unexpected error occurred in the LinkedIn post generator flow.";

  console.log(`[LinkedIn Post Flow] Server Action Entered. Input:`, input);

  try {
    const requestBody: { keyword?: string } = {};
    if (input.keyword) {
      requestBody.keyword = input.keyword;
    }

    console.log(`[LinkedIn Post Flow] Sending request to ${n8nWebhookUrl} with body:`, JSON.stringify(requestBody));

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
    });

    const responseStatus = response.status;
    const responseStatusText = response.statusText;
    const responseContentType = response.headers.get('content-type') || 'N/A';

    console.log(`[LinkedIn Post Flow] n8n Response Status: ${responseStatus} ${responseStatusText}`);
    console.log(`[LinkedIn Post Flow] n8n Response Content-Type: ${responseContentType}`);

    try {
      rawResponseText = await response.text();
      console.log("[LinkedIn Post Flow] Raw response text from n8n. Length:", rawResponseText.length, "Preview:", rawResponseText.substring(0, 500));
    } catch (textError: any) {
      console.warn("[LinkedIn Post Flow] Could not read response text from n8n:", textError.message);
      rawResponseText = "Could not read n8n response body.";
    }

    if (!response.ok) {
      detail = `N8N webhook request failed. Status: ${responseStatus} (${responseStatusText}). Response: ${rawResponseText.substring(0, 200) || "No response body."}`;
      console.error(`[LinkedIn Post Flow] Error from n8n webhook:`, detail);
      throw new Error(detail);
    }

    if (!responseContentType.includes('application/json')) {
      detail = `N8N webhook returned unexpected content type: ${responseContentType}. Expected JSON. Response: ${rawResponseText.substring(0, 200) || "No response body."}`;
      console.error(`[LinkedIn Post Flow] Unexpected Content-Type:`, detail);
      throw new Error(detail);
    }

    let parsedN8nResponse: any;
    try {
      parsedN8nResponse = JSON.parse(rawResponseText);
      console.log("[LinkedIn Post Flow] Successfully parsed JSON response from n8n:", parsedN8nResponse);
    } catch (parseError: any) {
      detail = `Failed to parse JSON response from N8N. Detail: ${parseError.message}. Raw response: ${rawResponseText.substring(0, 200) || "No response body."}`;
      console.error(`[LinkedIn Post Flow] JSON Parse Error:`, detail);
      throw new Error(detail);
    }

    let postTextFromN8N: string | undefined = undefined;
    let suggestedImagePromptFromN8N: string | undefined = undefined;
    let hashtagsFromN8N: string[] | undefined = undefined;

    if (parsedN8nResponse.postText && typeof parsedN8nResponse.postText === 'string') {
        // Case 1: n8n returns the ideal structure directly
        postTextFromN8N = parsedN8nResponse.postText;
        suggestedImagePromptFromN8N = parsedN8nResponse.suggestedImagePrompt;
        hashtagsFromN8N = parsedN8nResponse.hashtags;
    } else if (parsedN8nResponse["choices[0].message.content"] && typeof parsedN8nResponse["choices[0].message.content"] === 'string') {
        // Case 2: Handle the structure observed in the error log (key is literally "choices[0].message.content")
        postTextFromN8N = parsedN8nResponse["choices[0].message.content"];
    } else if (parsedN8nResponse.choices && Array.isArray(parsedN8nResponse.choices) && parsedN8nResponse.choices.length > 0 && parsedN8nResponse.choices[0].message && typeof parsedN8nResponse.choices[0].message.content === 'string') {
        // Case 3: n8n returns direct LLM response: {"choices": [{"message": {"content": "..."}}]}
        postTextFromN8N = parsedN8nResponse.choices[0].message.content;
    } else if (Array.isArray(parsedN8nResponse) && parsedN8nResponse.length > 0) {
        // Case 4: n8n response is an array
        const firstItem = parsedN8nResponse[0];
        if (firstItem.postText && typeof firstItem.postText === 'string') {
            postTextFromN8N = firstItem.postText;
            suggestedImagePromptFromN8N = firstItem.suggestedImagePrompt;
            hashtagsFromN8N = firstItem.hashtags;
        } else if (firstItem["choices[0].message.content"] && typeof firstItem["choices[0].message.content"] === 'string') {
            postTextFromN8N = firstItem["choices[0].message.content"];
        } else if (firstItem.choices && Array.isArray(firstItem.choices) && firstItem.choices.length > 0 && firstItem.choices[0].message && typeof firstItem.choices[0].message.content === 'string') {
            postTextFromN8N = firstItem.choices[0].message.content;
        } else if (firstItem.message && typeof firstItem.message.content === 'string') {
            // Case 5: Similar to audio, content is a stringified JSON or plain text inside a field
            let contentString = firstItem.message.content;
            if (contentString.trim().startsWith("{") && contentString.trim().endsWith("}")) { // Check if it's stringified JSON
                try {
                    const innerParsedContent = JSON.parse(contentString);
                    if (innerParsedContent.postText && typeof innerParsedContent.postText === 'string') {
                        postTextFromN8N = innerParsedContent.postText;
                        suggestedImagePromptFromN8N = innerParsedContent.suggestedImagePrompt;
                        hashtagsFromN8N = innerParsedContent.hashtags;
                    }
                } catch (innerParseError) {
                    console.warn("[LinkedIn Post Flow] Failed to parse inner content string as JSON, assuming plain text:", innerParseError, contentString.substring(0,100));
                    postTextFromN8N = contentString; // Fallback to treating as plain text
                }
            } else {
                postTextFromN8N = contentString; // Treat as plain text
            }
        }
    }

    if (postTextFromN8N === undefined) {
        detail = `N8N response does not contain expected 'postText' or parsable content. Data structure not recognized. Parsed Data: ${JSON.stringify(parsedN8nResponse).substring(0,300)}`;
        console.error(`[LinkedIn Post Flow] Data Extraction Error:`, detail, parsedN8nResponse);
        throw new Error(detail);
    }

    const dataForValidation: LinkedInPostGeneratorOutputType = {
        postText: postTextFromN8N,
        suggestedImagePrompt: suggestedImagePromptFromN8N,
        hashtags: hashtagsFromN8N,
    };

    const validationResult = LinkedInPostGeneratorOutputSchema.safeParse(dataForValidation);

    if (!validationResult.success) {
      detail = `N8N response validation failed. Errors: ${JSON.stringify(validationResult.error.format())}. Adapted Data Sent for Validation: ${JSON.stringify(dataForValidation).substring(0,200)}`;
      console.error(`[LinkedIn Post Flow] Zod Validation Error:`, detail, validationResult.error.issues);
      throw new Error(detail);
    }
    
    console.log("[LinkedIn Post Flow] Process completed successfully. Output:", validationResult.data);
    return validationResult.data as LinkedInPostGeneratorOutputType;

  } catch (error: any) {
    console.error(`[LinkedIn Post Flow] CRITICAL ERROR (outer catch): ${error.message}`);
    console.error("[LinkedIn Post Flow] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error || {})));
    
    const clientErrorMessage = (detail !== "An unexpected error occurred in the LinkedIn post generator flow." && detail)
      ? detail
      : (error instanceof Error ? error.message : "A critical server error occurred in LinkedIn post generation.");
                             
    console.error("[LinkedIn Post Flow] Client-facing error message to be thrown:", clientErrorMessage);
    throw new Error(`LinkedIn post generation failed: ${clientErrorMessage}`);
  }
}
