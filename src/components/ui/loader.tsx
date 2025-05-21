"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
}

export function Spinner({ className, size = 24 }: SpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin text-primary", className)}
      size={size}
    />
  );
}

export function FullPageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Spinner size={48} />
    </div>
  );
}
