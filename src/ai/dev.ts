
import { config } from 'dotenv';
config();

import '@/ai/flows/workflow-generator.ts';
import '@/ai/flows/keyword-suggestion-flow.ts';
import '@/ai/flows/audio-transcription-flow.ts'; // Added Audio Transcription flow

