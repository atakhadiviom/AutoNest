
import type { Workflow } from "@/lib/types";
import { Search, FileText } from "lucide-react"; // Added FileText

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
    id: "tool-blog-factory",
    name: "Blog Factory Tool",
    description: "Generate a complete blog post including title, meta description, content, and hashtags based on your research query using an n8n service.",
    createdAt: "2024-05-22T14:00:00Z",
    updatedAt: new Date().toISOString(),
    steps: [], // No predefined steps as it's a direct tool
    creatorEmail: "system@autonest.com",
    icon: FileText, // Using FileText icon
    creditCost: 5, // Example credit cost
    usageCount: 0,
    lastRunDate: undefined,
    isTool: true,
    runComponent: "BlogFactoryRunner", // Component to be created
  },
  // Other workflows could be added here
];
