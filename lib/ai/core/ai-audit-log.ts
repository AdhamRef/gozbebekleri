import type { AiAuditLogEntry, AiAuditStatus, AiAssistantContextKey, AiToolName } from "./ai-core-types";

const MAX_AUDIT_ENTRIES = 50;
const auditEntries: AiAuditLogEntry[] = [];

function auditId() {
  return globalThis.crypto?.randomUUID?.() ?? `ai-audit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sanitizePrompt(prompt: string) {
  return prompt
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[redacted-openai-key]")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 1200);
}

export function recordAiAuditLog(input: {
  prompt: string;
  context: AiAssistantContextKey;
  requestedTool: AiToolName | null;
  user: string;
  status: AiAuditStatus;
}) {
  const entry: AiAuditLogEntry = {
    id: auditId(),
    prompt: sanitizePrompt(input.prompt),
    context: input.context,
    requestedTool: input.requestedTool,
    user: input.user,
    timestamp: new Date().toISOString(),
    status: input.status,
  };
  auditEntries.unshift(entry);
  auditEntries.splice(MAX_AUDIT_ENTRIES);
  return entry;
}

export function listAiAuditLogEntries() {
  return [...auditEntries];
}
