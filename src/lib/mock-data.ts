
import type { Workflow } from "@/lib/types";
import { Search } from "lucide-react";

export const mockWorkflows: Workflow[] = [
  {
    id: "tool-keyword-research", // Changed ID slightly to reflect no n8n
    name: "Keyword Research Tool", // Removed (n8n)
    description: "Get keyword suggestions for your topic using an external service. Provides insights for content creation and SEO.", // Made description slightly more generic
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
  // Other workflows could be added here
];
