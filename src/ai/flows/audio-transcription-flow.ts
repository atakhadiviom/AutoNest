
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
  const n8nWebhookUrl = "https://n8n.autonest.site/webhook/transcribe";
  let rawResponseText = '';
  let responseStatus = 0;
  let responseStatusText = '';
  let responseContentType = '';
  let detail = "An unexpected error occurred in the audio transcription flow."; // Default detail

  console.log(`[Audio Transcription Flow] Preparing to send audio file: ${audioFile.name} (${audioFile.size} bytes) to ${n8nWebhookUrl}`);

  const formData = new FormData();
  formData.append("audioData", audioFile, audioFile.name);

  try {
    console.log("[Audio Transcription Flow] Attempting fetch to n8n webhook...");
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      body: formData,
      // 'Content-Type': 'multipart/form-data' is automatically set by browser for FormData
    });
    console.log("[Audio Transcription Flow] Fetch response received.");

    responseStatus = response.status;
    responseStatusText = response.statusText;
    responseContentType = response.headers.get('content-type') || 'N/A';
    
    console.log(`[Audio Transcription Flow] Response Status: ${responseStatus} ${responseStatusText}`);
    console.log(`[Audio Transcription Flow] Response Content-Type: ${responseContentType}`);

    rawResponseText = await response.text();
    console.log("[Audio Transcription Flow] Raw response text received. Length:", rawResponseText.length > 500 ? rawResponseText.substring(0,500) + "..." : rawResponseText);


    if (!response.ok) {
      detail = `N8N webhook request failed with status ${responseStatus} (${responseStatusText}). Response: ${rawResponseText.substring(0, 200) || "No response body."}`;
      console.error(
        `[Audio Transcription Flow] Error from n8n webhook. Status: ${responseStatus} ${responseStatusText}. Content-Type: ${responseContentType}. Raw Response:`,
        rawResponseText.substring(0, 500) // Log first 500 chars of raw response
      );
      throw new Error(detail);
    }

    if (!responseContentType.includes('application/json') && !responseContentType.includes('text/html')) { // n8n might return text/html with JSON content
      detail = `N8N webhook returned unexpected content type (${responseContentType}). Expected JSON or text/html containing JSON. Response: ${rawResponseText.substring(0, 200) || "No response body."}`;
      console.error(
        `[Audio Transcription Flow] Unexpected Content-Type from n8n webhook: ${responseContentType}. Expected JSON or text/html with JSON. Raw Response:`,
        rawResponseText.substring(0, 500)
      );
      throw new Error(detail);
    }
    
    let finalData: AudioTranscriptSummaryOutput;
    let parsedInnerContent: any; // To hold the parsed content string

    try {
        console.log("[Audio Transcription Flow] Attempting to parse raw response text as outer JSON...");
        const outerParsedResponse = JSON.parse(rawResponseText);
        console.log("[Audio Transcription Flow] Successfully parsed outer JSON response.");

        if (Array.isArray(outerParsedResponse) && outerParsedResponse.length > 0 &&
            outerParsedResponse[0].message && typeof outerParsedResponse[0].message.content === 'string') {
            
            let contentString = outerParsedResponse[0].message.content;
            console.log("[Audio Transcription Flow] Extracted content string. Length:", contentString.length, "Preview:", contentString.substring(0,100) + "...");

            // Clean the markdown JSON block
            if (contentString.startsWith("```json\n")) {
                contentString = contentString.substring(7); // Remove ```json\n
            }
            if (contentString.endsWith("\n```")) {
                contentString = contentString.substring(0, contentString.length - 4); // Remove \n```
            } else if (contentString.endsWith("```")) {
                 contentString = contentString.substring(0, contentString.length - 3); // Remove ```
            }
            contentString = contentString.trim();
            console.log("[Audio Transcription Flow] Cleaned content string. Preview:", contentString.substring(0,100) + "...");


            console.log("[Audio Transcription Flow] Attempting to parse cleaned inner content string as JSON...");
            parsedInnerContent = JSON.parse(contentString);
            console.log("[Audio Transcription Flow] Successfully parsed inner JSON content.");
        } else {
            // Fallback: attempt to parse rawResponseText directly as AudioTranscriptSummaryOutput or its content
            console.warn("[Audio Transcription Flow] Outer JSON not in expected nested format. Attempting direct parse of rawResponseText.");
            parsedInnerContent = JSON.parse(rawResponseText); 
        }

    } catch (parseError: any) {
        detail = `Failed to parse JSON response from N8N webhook. Detail: ${parseError.message}. Raw response snippet: ${rawResponseText.substring(0, 200) || "No response body."}`;
        console.error(
            `[Audio Transcription Flow] Failed to parse JSON response from n8n webhook. Raw Response:`,
            rawResponseText.substring(0, 500),
            `Parse Error:`, parseError
        );
        throw new Error(detail);
    }
    
    // Adapt to either 'transcriptSummary' or 'audioContentSummary'
    if (parsedInnerContent && parsedInnerContent.audioContentSummary && typeof parsedInnerContent.audioContentSummary === 'object') {
      console.log("[Audio Transcription Flow] Found 'audioContentSummary' key. Adapting to 'transcriptSummary'.");
      finalData = { transcriptSummary: parsedInnerContent.audioContentSummary as AudioTranscriptSummary };
    } else if (parsedInnerContent && parsedInnerContent.transcriptSummary && typeof parsedInnerContent.transcriptSummary === 'object') {
      console.log("[Audio Transcription Flow] Found 'transcriptSummary' key directly.");
      finalData = { transcriptSummary: parsedInnerContent.transcriptSummary as AudioTranscriptSummary };
    } else {
      // If neither is found directly, but parsedInnerContent itself matches the structure of AudioTranscriptSummary
      const keys = parsedInnerContent ? Object.keys(parsedInnerContent) : [];
      const summaryKeys = ['title', 'summary', 'main_points', 'action_items', 'sentiment']; // Sample of expected keys
      const looksLikeSummary = summaryKeys.every(key => keys.includes(key));

      if (looksLikeSummary) {
        console.warn("[Audio Transcription Flow] 'transcriptSummary' or 'audioContentSummary' object not found directly, but root object looks like a summary. Adapting.");
        finalData = { transcriptSummary: parsedInnerContent as AudioTranscriptSummary };
      } else {
        detail = "Invalid data format from N8N: Neither 'transcriptSummary' nor 'audioContentSummary' object found in the parsed inner content, and root object doesn't match summary structure.";
        console.error("[Audio Transcription Flow] Unexpected data format from n8n webhook. Details:", detail, "Parsed Inner Content:", parsedInnerContent);
        throw new Error(detail);
      }
    }

    console.log("[Audio Transcription Flow] Parsed final data from n8n webhook (after potential adaptation):", JSON.stringify(finalData, null, 2).substring(0, 500));

    if (!finalData || typeof finalData.transcriptSummary !== 'object' || finalData.transcriptSummary === null) {
        detail = "Invalid data format from N8N: 'transcriptSummary' object missing or invalid in the final adapted data.";
        console.error("[Audio Transcription Flow] Unexpected data format from n8n webhook after adaptation. 'transcriptSummary' object missing or not an object. Final Data:", finalData);
        throw new Error(detail);
    }
    
    // Basic validation of the structure (can be expanded with Zod if needed)
    if (typeof finalData.transcriptSummary.title !== 'string' || typeof finalData.transcriptSummary.summary !== 'string') {
        detail = "Invalid transcriptSummary format from N8N: title or summary is not a string in the final adapted data.";
        console.warn("[Audio Transcription Flow] Received transcriptSummary, but title or summary is not a string. Final Data:", finalData.transcriptSummary);
        // Potentially throw an error or attempt to use it as is, depending on strictness
        // For now, we will proceed if title/summary are not strings, but log a warning.
    }
    
    console.log("[Audio Transcription Flow] Process completed successfully.");
    return finalData;

  } catch (error: any) {
    console.error("[Audio Transcription Flow] Error in transcription process overall:", error.message, error.stack);
    
    // 'detail' variable should be set by the specific error in the try block if it occurred there
    const errorMessage = detail || (error instanceof Error ? error.message : "Unknown server error");

    const errorContext = {
        message: errorMessage,
        originalErrorName: error.name,
        originalErrorMessage: error.message,
        n8nWebhookUrl,
        attemptedFileName: audioFile.name,
        responseStatusCaptured: responseStatus,
        responseStatusTextCaptured: responseStatusText,
        responseContentTypeCaptured: responseContentType,
        rawResponseTextPreview: rawResponseText.substring(0, 200) || "Raw response text not captured or empty before error.",
    };
    console.error("[Audio Transcription Flow] Detailed Error Context (before re-throw):", errorContext);

    throw new Error(`Audio transcription failed: ${errorMessage}`);
  }
}
