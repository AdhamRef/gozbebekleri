"use client";

import { useMemo, useState } from "react";
import type { OperationsOverview } from "@/lib/operations/types";
import { OperationsContentKanban } from "./OperationsContentKanban";
import { OperationsContentPlans } from "./OperationsContentPlans";
import { OperationsFilters } from "./OperationsFilters";

type BoardColumn = readonly [status: string, label: string, description: string];

type OperationsContentWorkspaceProps = {
  filters: readonly string[];
  items: OperationsOverview["items"];
  plans: OperationsOverview["plans"];
  boardColumns: readonly BoardColumn[];
  statusClass: Record<string, string>;
};

function searchableText(item: OperationsOverview["items"][number]) {
  return [item.title, item.type, item.status, item.channel, item.due].join(" ").toLowerCase();
}

export function OperationsContentWorkspace({ filters, items, plans, boardColumns, statusClass }: OperationsContentWorkspaceProps) {
  const [selectedStatus, setSelectedStatus] = useState(filters[0] ?? "كل الحالات");
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const statusMatches = selectedStatus === "كل الحالات" || item.status === selectedStatus;
      const queryMatches = !normalizedQuery || searchableText(item).includes(normalizedQuery);
      return statusMatches && queryMatches;
    });
  }, [items, query, selectedStatus]);

  return (
    <>
      <OperationsFilters
        filters={filters}
        selectedFilter={selectedStatus}
        query={query}
        resultCount={filteredItems.length}
        totalCount={items.length}
        onFilterChange={setSelectedStatus}
        onQueryChange={setQuery}
      />
      <OperationsContentKanban items={filteredItems} boardColumns={boardColumns} statusClass={statusClass} />
      <OperationsContentPlans plans={plans} items={filteredItems} statusClass={statusClass} />
    </>
  );
}
