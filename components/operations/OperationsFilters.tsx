"use client";

import { Filter, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type OperationsFiltersProps = {
  filters: readonly string[];
  selectedFilter: string;
  query: string;
  resultCount: number;
  totalCount: number;
  onFilterChange: (filter: string) => void;
  onQueryChange: (query: string) => void;
};

export function OperationsFilters({ filters, selectedFilter, query, resultCount, totalCount, onFilterChange, onQueryChange }: OperationsFiltersProps) {
  return (
    <Card>
      <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#025EB8]" /> فلاتر التشغيل
          </CardTitle>
          <CardDescription className="mt-2">فلترة فعلية حسب الحالة والبحث داخل عناصر المحتوى المحفوظة.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = selectedFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={active}
                onClick={() => onFilterChange(filter)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? "border-[#025EB8] bg-[#025EB8] text-white" : "bg-white text-slate-700 hover:border-[#025EB8] hover:text-[#025EB8]"}`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <label className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="ابحث بالعنوان، النوع، القناة، الحالة، أو الموعد"
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </label>
        <p className="mt-2 text-xs font-semibold text-slate-500">يعرض {resultCount} من {totalCount} عنصر.</p>
      </CardContent>
    </Card>
  );
}
