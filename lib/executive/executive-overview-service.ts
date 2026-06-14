import { buildMarketingCommandCenterOverview } from "@/lib/marketing/command-center/command-center-service";
import { buildProviderHealthOverview, type ProviderConnectionHealthInput } from "@/lib/marketing/integrations/provider-health-service";
import { buildOperationsCommandCenterOverview } from "@/lib/operations/command-center/command-center-service";
import type { OperationsOverview } from "@/lib/operations/types";

export type ExecutiveAction = {
  id: string;
  area: "MARKETING" | "OPERATIONS" | "INTEGRATIONS";
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  reason: string;
  href: string;
  cta: string;
};

export type ExecutiveOverview = {
  source: string;
  generatedAt: string;
  summary: {
    marketingActions: number;
    operationsActions: number;
    highPriorityActions: number;
    providerReady: number;
    providerNeedsWork: number;
    openOperationalTasks: number;
    readyForMarketing: number;
    marketingRevenue: number;
    averageRoas: number;
  };
  actions: ExecutiveAction[];
};

export function buildExecutiveOverview(params: {
  connections: ProviderConnectionHealthInput[];
  operations: OperationsOverview;
}): ExecutiveOverview {
  const providerHealth = buildProviderHealthOverview(params.connections);
  const marketing = buildMarketingCommandCenterOverview(providerHealth);
  const operations = buildOperationsCommandCenterOverview(params.operations);

  const marketingActions: ExecutiveAction[] = marketing.actions.slice(0, 5).map((action) => ({
    id: `marketing-${action.id}`,
    area: action.type === "CONNECT_PROVIDER" || action.type === "FIX_PROVIDER_CONFIG" ? "INTEGRATIONS" : "MARKETING",
    priority: action.priority,
    title: action.title,
    reason: action.reason,
    href: action.href,
    cta: action.cta,
  }));

  const operationsActions: ExecutiveAction[] = operations.actions.slice(0, 5).map((action) => ({
    id: `operations-${action.id}`,
    area: "OPERATIONS",
    priority: action.priority,
    title: action.title,
    reason: action.reason,
    href: action.href,
    cta: action.cta,
  }));

  const actions = [...marketingActions, ...operationsActions]
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, 10);

  return {
    source: "executive-system-overview-v1",
    generatedAt: new Date().toISOString(),
    summary: {
      marketingActions: marketing.actions.length,
      operationsActions: operations.actions.length,
      highPriorityActions: actions.filter((action) => action.priority === "HIGH").length,
      providerReady: marketing.summary.providerReady,
      providerNeedsWork: marketing.summary.providerNeedsWork,
      openOperationalTasks: operations.summary.openTasks,
      readyForMarketing: operations.summary.readyForMarketing,
      marketingRevenue: marketing.summary.totalRevenue,
      averageRoas: marketing.summary.averageRoas,
    },
    actions,
  };
}

function priorityRank(priority: ExecutiveAction["priority"]) {
  if (priority === "HIGH") return 0;
  if (priority === "MEDIUM") return 1;
  return 2;
}
