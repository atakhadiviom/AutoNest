
import type { Workflow } from "@/lib/types";
import { Search } from "lucide-react"; // Changed from Lightbulb to Search

export const mockWorkflows: Workflow[] = [
  {
    id: "tool-keyword-research-n8n",
    name: "Keyword Research Tool (n8n)",
    description: "Get keyword suggestions for your topic using an external n8n-powered service. Provides insights for content creation and SEO.",
    createdAt: "2024-03-15T10:00:00Z", // Example date
    updatedAt: new Date().toISOString(),
    steps: [], // Tools typically don't have predefined steps visible in this way
    creatorEmail: "system@autonest.com",
    icon: Search,
    creditCost: 1, // Example credit cost
    usageCount: 0,
    lastRunDate: undefined,
    isTool: true,
    runComponent: "KeywordSuggesterRunner", // This component will handle the interaction
  },
  // Other workflows could be added here
];

