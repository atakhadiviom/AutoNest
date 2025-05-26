
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
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      body: formData,
      // 'Content-Type': 'multipart/form-data' is automatically set by browser for FormData
    });

    responseStatus = response.status;
    responseStatusText = response.statusText;
    responseContentType = response.headers.get('content-type') || 'N/A';
    rawResponseText = await response.text();

    if (!response.ok) {
      console.error(
        `[Audio Transcription Flow] Error from n8n webhook. Status: ${responseStatus} ${responseStatusText}. Content-Type: ${responseContentType}. Raw Response:`,
        rawResponseText
      );
      throw new Error(
        `N8N webhook request failed with status ${responseStatus} (${responseStatusText}). Response: ${rawResponseText || "No response body."}`
      );
    }

    if (!responseContentType.includes('application/json')) {
      console.error(
        `[Audio Transcription Flow] Unexpected Content-Type from n8n webhook: ${responseContentType}. Expected JSON. Raw Response:`,
        rawResponseText
      );
      throw new Error(
        `N8N webhook returned non-JSON content (${responseContentType}). Response: ${rawResponseText || "No response body."}`
      );
    }
    
    let data: AudioTranscriptSummaryOutput;
    try {
        data = JSON.parse(rawResponseText) as AudioTranscriptSummaryOutput;
    } catch (parseError: any) {
        console.error(
            `[Audio Transcription Flow] Failed to parse JSON response from n8n webhook. Raw Response:`,
            rawResponseText,
            `Parse Error:`, parseError
        );
        throw new Error(
            `Failed to parse JSON response from N8N webhook. Detail: ${parseError.message}. Raw response: ${rawResponseText || "No response body."}`
        );
    }
    
    console.log("[Audio Transcription Flow] Successfully parsed data from n8n webhook:", JSON.stringify(data, null, 2));

    if (!data || !data.transcriptSummary) {
        console.error("[Audio Transcription Flow] Unexpected data format from n8n webhook. 'transcriptSummary' missing. Data:", data);
        throw new Error("Invalid data format received from transcription service. 'transcriptSummary' missing.");
    }

    // Basic validation of the structure (can be expanded with Zod if needed)
    if (typeof data.transcriptSummary.title !== 'string' || typeof data.transcriptSummary.summary !== 'string') {
        console.warn("[Audio Transcription Flow] Received transcriptSummary, but title or summary is not a string. Data:", data.transcriptSummary);
        // Potentially throw an error or attempt to use it as is, depending on strictness
    }
    
    return data;

  } catch (error: any) {
    console.error("[Audio Transcription Flow] Error in transcription process:", error.message, error.stack);
    // Construct a detailed error message
    let detail = "An unexpected error occurred in the audio transcription flow.";
    if (error instanceof Error) {
      detail = error.message;
    } else if (typeof error === 'string') {
      detail = error;
    }
    
    const errorContext = {
        message: detail,
        originalError: error.toString(),
        n8nWebhookUrl,
        attemptedFileName: audioFile.name,
        responseStatus,
        responseStatusText,
        responseContentType,
        rawResponseText: rawResponseText || "Raw response text not captured before error.",
    };
    console.error("[Audio Transcription Flow] Error Context:", errorContext);

    // Re-throw a new error with more context, to be caught by the client
    throw new Error(`Audio transcription failed. Detail: ${detail}. Status: ${responseStatus}. Raw: ${rawResponseText.substring(0, 100)}...`);
  }
}
