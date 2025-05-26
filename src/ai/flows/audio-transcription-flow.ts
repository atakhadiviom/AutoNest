
'use server';
/**
 * @fileOverview An audio transcription and summarization agent that sends audio to an n8n webhook.
 *
 * - transcribeAndSummarizeAudio - A function that handles sending audio and receiving a summary.
 * - AudioTranscriptionInput - The input type for the transcribeAndSummarizeAudio function (File object).
 * - AudioTranscriptSummaryOutput - The return type from the n8n webhook.
 */

import type { AudioTranscriptSummaryOutput } from '@/lib/types'; // Import the type

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
    console.log("[Audio Transcription Flow] Raw response text received. Length:", rawResponseText.length);


    if (!response.ok) {
      console.error(
        `[Audio Transcription Flow] Error from n8n webhook. Status: ${responseStatus} ${responseStatusText}. Content-Type: ${responseContentType}. Raw Response:`,
        rawResponseText.substring(0, 500) // Log first 500 chars of raw response
      );
      throw new Error(
        `N8N webhook request failed with status ${responseStatus} (${responseStatusText}). Response: ${rawResponseText.substring(0, 200) || "No response body."}`
      );
    }

    if (!responseContentType.includes('application/json')) {
      console.error(
        `[Audio Transcription Flow] Unexpected Content-Type from n8n webhook: ${responseContentType}. Expected JSON. Raw Response:`,
        rawResponseText.substring(0, 500)
      );
      throw new Error(
        `N8N webhook returned non-JSON content (${responseContentType}). Response: ${rawResponseText.substring(0, 200) || "No response body."}`
      );
    }
    
    let data: AudioTranscriptSummaryOutput;
    try {
        console.log("[Audio Transcription Flow] Attempting to parse JSON response...");
        data = JSON.parse(rawResponseText) as AudioTranscriptSummaryOutput;
        console.log("[Audio Transcription Flow] Successfully parsed JSON response.");
    } catch (parseError: any) {
        console.error(
            `[Audio Transcription Flow] Failed to parse JSON response from n8n webhook. Raw Response:`,
            rawResponseText.substring(0, 500),
            `Parse Error:`, parseError
        );
        throw new Error(
            `Failed to parse JSON response from N8N webhook. Detail: ${parseError.message}. Raw response: ${rawResponseText.substring(0, 200) || "No response body."}`
        );
    }
    
    console.log("[Audio Transcription Flow] Parsed data from n8n webhook:", JSON.stringify(data, null, 2).substring(0, 500));

    if (!data || typeof data.transcriptSummary !== 'object' || data.transcriptSummary === null) {
        console.error("[Audio Transcription Flow] Unexpected data format from n8n webhook. 'transcriptSummary' object missing or not an object. Data:", data);
        throw new Error("Invalid data format: 'transcriptSummary' object missing or invalid.");
    }
    
    // Basic validation of the structure (can be expanded with Zod if needed)
    if (typeof data.transcriptSummary.title !== 'string' || typeof data.transcriptSummary.summary !== 'string') {
        console.warn("[Audio Transcription Flow] Received transcriptSummary, but title or summary is not a string. Data:", data.transcriptSummary);
        // Potentially throw an error or attempt to use it as is, depending on strictness
        // For now, we will proceed if title/summary are not strings, but log a warning.
        // If these are essential, an error should be thrown:
        // throw new Error("Invalid transcriptSummary format: title or summary is not a string.");
    }
    
    console.log("[Audio Transcription Flow] Process completed successfully.");
    return data;

  } catch (error: any) {
    console.error("[Audio Transcription Flow] Error in transcription process overall:", error.message, error.stack);
    
    let detail = "An unexpected error occurred in the audio transcription flow.";
    if (error instanceof Error) {
      detail = error.message;
    } else if (typeof error === 'string') {
      detail = error;
    }
    
    const errorContext = {
        message: detail,
        originalErrorName: error.name,
        originalErrorMessage: error.message,
        n8nWebhookUrl,
        attemptedFileName: audioFile.name,
        responseStatusCaptured: responseStatus,
        responseStatusTextCaptured: responseStatusText,
        responseContentTypeCaptured: responseContentType,
        rawResponseTextPreview: rawResponseText.substring(0, 200) || "Raw response text not captured or empty before error.",
    };
    console.error("[Audio Transcription Flow] Detailed Error Context:", errorContext);

    // Re-throw a new, standard Error object with more context
    throw new Error(`Audio transcription failed. Detail: ${detail}. Status: ${responseStatus || 'N/A'}. Raw Resp: ${rawResponseText.substring(0,100)}...`);
  }
}
