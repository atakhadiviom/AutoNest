
import type { Workflow } from "@/lib/types";
import { Search } from "lucide-react"; // FileText removed as Blog Factory is removed

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
  // Other workflows could be added here
];
