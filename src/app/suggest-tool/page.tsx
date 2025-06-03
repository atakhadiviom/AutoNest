
"use client";

import AppLayout from "@/components/layout/app-layout";
import { SuggestToolForm } from "@/components/tools/suggest-tool-form";

export default function SuggestToolPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <SuggestToolForm />
      </div>
    </AppLayout>
  );
}
