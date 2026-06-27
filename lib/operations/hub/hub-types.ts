export type OperationsHubSectionKey =
  | "overview"
  | "calendar"
  | "monthly-plan"
  | "content"
  | "team-tasks"
  | "publishing"
  | "messages"
  | "workflow"
  | "donor-reactivation"
  | "ai-assistant"
  | "learnings";

export type OperationsHubSection = {
  key: OperationsHubSectionKey;
  title: string;
  description: string;
  href: string;
  priority: "PRIMARY" | "SECONDARY";
};

export type OperationsHubAlert = {
  id: string;
  title: string;
  description: string;
  tone: "danger" | "warning" | "info";
  href: string;
};

export type OperationsTeamPerformance = {
  name: string;
  completionRate: number;
  openTasks: number;
};

export type OperationsWorkflowStage = {
  key: string;
  title: string;
  count: number;
  description: string;
};

export type OperationsHubOverview = {
  generatedAt: string;
  today: {
    dateLabel: string;
    tasks: number;
    scheduledPosts: number;
    messages: number;
    adLaunches: number;
  };
  month: {
    requiredContent: number;
    completedContent: number;
    inProgressContent: number;
    delayedItems: number;
    completionRate: number;
  };
  alerts: OperationsHubAlert[];
  team: OperationsTeamPerformance[];
  workflow: OperationsWorkflowStage[];
  sections: OperationsHubSection[];
};
