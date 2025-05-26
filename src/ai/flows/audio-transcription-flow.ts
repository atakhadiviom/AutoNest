
'use server';
/**
 * @fileOverview An audio transcription and summarization agent that sends audio to an n8n webhook.
 *
 * - transcribeAndSummarizeAudio - A function that handles sending audio and receiving a summary.
 * - AudioTranscriptionInput - The input type for the transcribeAndSummarizeAudio function (File object).
 * - AudioTranscriptSummaryOutput - The return type from the n8n webhook.
 */

import type { AudioTranscriptSummaryOutput, AudioTranscriptSummary } from '@/lib/types'; // Import the type

// Input type is a File object from the browser, not easily described by Zod for server-side.
// We'll assume the runner component handles File validation.
export type AudioTranscriptionInput = File;

export async function transcribeAndSummarizeAudio(
  audioFile: AudioTranscriptionInput
): Promise<AudioTranscriptSummaryOutput> {
  // Top-level try-catch to capture any error within the server action
  try {
    console.log(`[Audio Transcription Flow] Server Action Entered. Received audioFile: name='${audioFile?.name}', size='${audioFile?.size}', type='${audioFile?.type}'`);

    if (!audioFile || typeof audioFile.name !== 'string' || typeof audioFile.size !== 'number' || typeof audioFile.type !== 'string') {
      console.error("[Audio Transcription Flow] Invalid audioFile argument received by Server Action.", audioFile);
      throw new Error("Invalid audio file data received by server.");
    }

    const n8nWebhookUrl = "https://n8n.autonest.site/webhook/transcribe";
    let rawResponseText = '';
    let responseStatus = 0;
    let responseStatusText = '';
    let responseContentType = '';
    let detail = "An unexpected error occurred in the audio transcription flow.";

    console.log(`[Audio Transcription Flow] Preparing to send audio file: ${audioFile.name} (${audioFile.size} bytes, type: ${audioFile.type}) to ${n8nWebhookUrl}`);

    const formData = new FormData();
    formData.append("audioData", audioFile, audioFile.name);

    try {
      console.log("[Audio Transcription Flow] Attempting fetch to n8n webhook...");
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        body: formData,
      });
      console.log("[Audio Transcription Flow] Fetch response received from n8n.");

      responseStatus = response.status;
      responseStatusText = response.statusText;
      responseContentType = response.headers.get('content-type') || 'N/A';
      
      console.log(`[Audio Transcription Flow] n8n Response Status: ${responseStatus} ${responseStatusText}`);
      console.log(`[Audio Transcription Flow] n8n Response Content-Type: ${responseContentType}`);

      rawResponseText = await response.text();
      console.log("[Audio Transcription Flow] Raw response text from n8n. Length:", rawResponseText.length > 500 ? rawResponseText.substring(0,500) + "..." : rawResponseText);

      if (!response.ok) {
        detail = `N8N webhook request failed. Status: ${responseStatus} (${responseStatusText}). Response Body: ${rawResponseText.substring(0, 500) || "No response body."}`;
        if (responseStatus === 413) {
          detail = `N8N webhook request failed: Payload Too Large (Status 413). The audio file likely exceeds n8n's upload limit. Response: ${rawResponseText.substring(0, 200) || "No response body."}`;
        }
        console.error(
          `[Audio Transcription Flow] Error from n8n webhook. Status: ${responseStatus} ${responseStatusText}. Content-Type: ${responseContentType}. Raw Response (first 500 chars):`,
          rawResponseText.substring(0, 500)
        );
        throw new Error(detail);
      }
      
      if (!responseContentType.includes('application/json') && !responseContentType.includes('text/html')) {
        detail = `N8N webhook returned unexpected content type (${responseContentType}). Expected JSON or text/html containing JSON. Response: ${rawResponseText.substring(0, 200) || "No response body."}`;
        console.error(
          `[Audio Transcription Flow] Unexpected Content-Type from n8n webhook: ${responseContentType}. Expected JSON or text/html with JSON. Raw Response (first 500 chars):`,
          rawResponseText.substring(0, 500)
        );
        throw new Error(detail);
      }
      
      let parsedInnerContent: any;
      try {
        console.log("[Audio Transcription Flow] Attempting to parse raw response text as outer JSON...");
        const outerParsedResponse = JSON.parse(rawResponseText);
        console.log("[Audio Transcription Flow] Successfully parsed outer JSON response from n8n.");

        if (Array.isArray(outerParsedResponse) && outerParsedResponse.length > 0 &&
            outerParsedResponse[0].message && typeof outerParsedResponse[0].message.content === 'string') {
            
            let contentString = outerParsedResponse[0].message.content;
            console.log("[Audio Transcription Flow] Extracted inner content string. Length:", contentString.length, "Preview:", contentString.substring(0,100) + "...");

            if (contentString.startsWith("```json\n")) {
                contentString = contentString.substring(7); 
            }
            if (contentString.endsWith("\n```")) {
                contentString = contentString.substring(0, contentString.length - 4);
            } else if (contentString.endsWith("```")) {
                 contentString = contentString.substring(0, contentString.length - 3);
            }
            contentString = contentString.trim();
            console.log("[Audio Transcription Flow] Cleaned inner content string. Preview:", contentString.substring(0,100) + "...");

            console.log("[Audio Transcription Flow] Attempting to parse cleaned inner content string as JSON...");
            parsedInnerContent = JSON.parse(contentString);
            console.log("[Audio Transcription Flow] Successfully parsed inner JSON content.");
        } else {
            console.warn("[Audio Transcription Flow] Outer JSON from n8n not in expected nested format. Attempting direct parse of rawResponseText.");
            parsedInnerContent = JSON.parse(rawResponseText); 
        }
      } catch (parseError: any) {
        detail = `Failed to parse JSON response from N8N webhook. Detail: ${parseError.message}. Raw response snippet: ${rawResponseText.substring(0, 200) || "No response body."}`;
        console.error(
            `[Audio Transcription Flow] Failed to parse JSON response from n8n webhook. Raw Response (first 500 chars):`,
            rawResponseText.substring(0, 500),
            `Parse Error:`, parseError
        );
        throw new Error(detail);
      }
      
      let finalData: AudioTranscriptSummaryOutput;
      if (parsedInnerContent && parsedInnerContent.audioContentSummary && typeof parsedInnerContent.audioContentSummary === 'object') {
        console.log("[Audio Transcription Flow] Found 'audioContentSummary' key. Adapting to 'transcriptSummary'.");
        finalData = { transcriptSummary: parsedInnerContent.audioContentSummary as AudioTranscriptSummary };
      } else if (parsedInnerContent && parsedInnerContent.transcriptSummary && typeof parsedInnerContent.transcriptSummary === 'object') {
        console.log("[Audio Transcription Flow] Found 'transcriptSummary' key directly.");
        finalData = { transcriptSummary: parsedInnerContent.transcriptSummary as AudioTranscriptSummary };
      } else {
        const keys = parsedInnerContent ? Object.keys(parsedInnerContent) : [];
        const summaryKeys = ['title', 'summary', 'main_points', 'action_items', 'sentiment'];
        const looksLikeSummary = summaryKeys.every(key => keys.includes(key));

        if (looksLikeSummary) {
          console.warn("[Audio Transcription Flow] 'transcriptSummary' or 'audioContentSummary' object not found directly, but root object looks like a summary. Adapting.");
          finalData = { transcriptSummary: parsedInnerContent as AudioTranscriptSummary };
        } else {
          detail = "Invalid data format from N8N: Neither 'transcriptSummary' nor 'audioContentSummary' found in parsed content, and root object doesn't match summary structure.";
          console.error("[Audio Transcription Flow] Unexpected data format from n8n webhook. Details:", detail, "Parsed Inner Content:", parsedInnerContent);
          throw new Error(detail);
        }
      }

      console.log("[Audio Transcription Flow] Parsed final data from n8n webhook (after adaptation). Preview:", JSON.stringify(finalData, null, 2).substring(0, 500));

      if (!finalData || typeof finalData.transcriptSummary !== 'object' || finalData.transcriptSummary === null) {
          detail = "Invalid data format from N8N: 'transcriptSummary' object missing or invalid in the final adapted data.";
          console.error("[Audio Transcription Flow] Unexpected data format from n8n webhook after adaptation. 'transcriptSummary' object missing or not an object. Final Data:", finalData);
          throw new Error(detail);
      }
      
      if (typeof finalData.transcriptSummary.title !== 'string' || typeof finalData.transcriptSummary.summary !== 'string') {
          detail = "Invalid transcriptSummary format from N8N: title or summary is not a string in the final adapted data.";
          console.warn("[Audio Transcription Flow] Received transcriptSummary, but title or summary is not a string. Final Data:", finalData.transcriptSummary);
      }
      
      console.log("[Audio Transcription Flow] Process completed successfully.");
      return finalData;

    } catch (error: any) {
      console.error("[Audio Transcription Flow] Error in n8n interaction or parsing (inner catch):", error.message);
      const errorMessage = detail !== "An unexpected error occurred in the audio transcription flow." ? detail : (error instanceof Error ? error.message : "Unknown server error during audio transcription flow.");
      throw new Error(errorMessage); // Re-throw to be caught by the top-level catch or Next.js
    }
  } catch (topLevelError: any) {
    // This will catch errors from the initial argument validation or any other unexpected errors.
    console.error("[Audio Transcription Flow] CRITICAL ERROR in Server Action (top-level catch):", topLevelError.message);
    console.error("[Audio Transcription Flow] Top-level error stack:", topLevelError.stack);
    // Ensure a standard Error object with a message is thrown.
    throw new Error(topLevelError.message || "A critical unexpected server error occurred in audio transcription flow.");
  }
}
