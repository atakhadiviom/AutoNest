"use client";

import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import type { ChangeEventHandler} from "react";
import { useState } from "react";

interface WorkflowSearchProps {
  onSearchChange: (searchTerm: string) => void;
}

export function WorkflowSearch({ onSearchChange }: WorkflowSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    onSearchChange(newSearchTerm);
  };

  return (
    <div className="relative mb-8">
      <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search workflows by name or description..."
        className="w-full rounded-lg bg-card py-3 pl-10 pr-4 text-base shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
        value={searchTerm}
        onChange={handleInputChange}
        aria-label="Search workflows"
      />
    </div>
  );
}
