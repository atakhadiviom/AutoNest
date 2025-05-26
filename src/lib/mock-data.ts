
import type { Workflow } from "@/lib/types";
import { Search, Mic } from "lucide-react"; 

export const mockWorkflows: Workflow[] = [
  {
    id: "tool-keyword-research",
    name: "Keyword Research Tool",
    description: "Get keyword suggestions for your topic using an external service. Provides insights for content creation and SEO.",
    createdAt: "2024-03-15T10:00:00Z",
    updatedAt: new Date().toISOString(),
    steps: [],
    creatorEmail: "system@autonest.com",
    icon: Search,
    creditCost: 1,
    usageCount: 0,
    lastRunDate: undefined,
    isTool: true,
    runComponent: "KeywordSuggesterRunner",
  },
  {
    id: "tool-audio-transcription",
    name: "Audio Transcription & Summarization",
    description: "Upload an audio file to transcribe its content and generate a structured summary including main points, action items, and sentiment.",
    createdAt: "2024-05-26T10:00:00Z",
    updatedAt: new Date().toISOString(),
    steps: [], // No predefined steps as it's a direct tool
    creatorEmail: "system@autonest.com",
    icon: Mic, 
    creditCost: 10, // Example cost, adjust as needed
    usageCount: 0,
    lastRunDate: undefined,
    isTool: true,
    runComponent: "AudioTranscriberRunner",
  },
];
