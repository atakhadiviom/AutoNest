
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

    let parsedData: any;
    try {
      parsedData = JSON.parse(rawResponseText);
      console.log("[LinkedIn Post Flow] Successfully parsed JSON response from n8n:", parsedData);
    } catch (parseError: any) {
      detail = `Failed to parse JSON response from N8N. Detail: ${parseError.message}. Raw response: ${rawResponseText.substring(0, 200) || "No response body."}`;
      console.error(`[LinkedIn Post Flow] JSON Parse Error:`, detail);
      throw new Error(detail);
    }

    // Validate against the Zod schema
    const validationResult = LinkedInPostGeneratorOutputSchema.safeParse(parsedData);
    if (!validationResult.success) {
      detail = `N8N response validation failed. Errors: ${validationResult.error.flatten().fieldErrors}. Data: ${JSON.stringify(parsedData).substring(0,200)}`;
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
