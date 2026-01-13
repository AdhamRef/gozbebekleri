"use client"; // Mark this as a client component

import { useState } from "react";
import BlogEditorAR from "../../../../blog/_components/BlogEditor";
import BlogEditorEN from "../../../../blog/_components/BlogEditorEN";
import { CardContent } from "@/components/ui/card";

interface LanguageTabsProps {
  post: any; // Replace with your Post type
  categories: { label: string; value: string }[];
}

export default function LanguageTabs({ post, categories }: LanguageTabsProps) {
  const [activeTab, setActiveTab] = useState<"ar" | "en">("ar");

  return (
    <CardContent className="p-6">
      {/* Language Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("ar")}
          className={`px-4 py-2 rounded-md ${
            activeTab === "ar"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          العربية
        </button>
        <button
          onClick={() => setActiveTab("en")}
          className={`px-4 py-2 rounded-md ${
            activeTab === "en"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          English
        </button>
      </div>

      {/* Render the appropriate editor based on the active tab */}
      {activeTab === "ar" ? (
        <BlogEditorAR post={post} categories={categories} userId={undefined} />
      ) : (
        <BlogEditorEN post={post} categories={categories} userId={undefined} />
      )}
    </CardContent>
  );
}