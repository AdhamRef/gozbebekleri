import { createHmac } from "node:crypto";

type ExportKind = "sessions" | "events";

export interface ClarityExportInput {
  csv: string;
  kind?: ExportKind;
}

interface SessionInventoryRow {
  evidenceKey: string | null;
  day: string | null;
  hourIstanbul: string | null;
  route: string;
  device: string;
  browser: string;
  os: string;
}

interface EventInventoryRow {
  evidenceKey: string | null;
  day: string | null;
  hourIstanbul: string | null;
  offsetSeconds: number | null;
  eventType: string;
  route: string;
}

export interface ClarityExportInventory {
  sourceFiles: number;
  sessionRows: number;
  uniqueSessionKeys: number;
  sessionsWithoutKey: number;
  sessionsWithoutDate: number;
  eventRows: number;
  eventsWithoutKey: number;
  eventsWithoutDate: number;
  eventsWithOffset: number;
  sessions: SessionInventoryRow[];
  events: EventInventoryRow[];
  eventCounts: Record<string, number>;
}

const HEADER_ALIASES = {
  sessionId: ["sessionid", "session", "sessionkey"],
  start: ["starttime", "startedat", "sessionstart", "startdate"],
  event: ["eventname", "customevent", "eventtype", "event"],
  time: ["timestamp", "eventtime", "time", "offset", "timeoffset"],
  route: ["url", "pageurl", "entryurl", "landingurl", "path", "page"],
  device: ["device", "devicetype"],
  browser: ["browser", "browsername"],
  os: ["os", "operatingsystem"],
} as const;

const LOCALES = new Set(["ar", "en", "fr", "tr", "id", "pt", "es", "de"]);
const STATIC_ROUTE_SEGMENTS = new Set([
  "about", "api", "auth", "bank-transfer", "blog", "campaign", "campaigns",
  "cart", "categories", "category", "checkout", "contact", "dashboard",
  "donate", "donation", "donation-failed", "donations", "faq", "fail",
  "home", "impact", "initiate", "monthly", "ok", "payfor", "privacy",
  "profile", "projects", "referrals", "result", "signin", "stripe",
  "subscriptions", "success", "terms", "tracking", "3dpay",
]);
const DYNAMIC_ROUTE_PARENTS = new Set([
  "blog", "campaign", "category", "donation", "donations", "impact",
  "referrals", "success",
]);
const SAFE_EVENT_LABELS = new Map([
  ["dead click", "Dead click"],
  ["excessive scroll", "Excessive scroll"],
  ["javascript error", "JavaScript error"],
  ["page hidden", "Page hidden"],
  ["page view", "Page view"],
  ["quick back", "Quick back"],
  ["rage click", "Rage click"],
]);

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = csv.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}

function normalizedHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: string[], aliases: readonly string[]): number {
  const normalized = headers.map(normalizedHeader);
  return normalized.findIndex((header) => aliases.includes(header));
}

function cell(row: string[], column: number): string {
  return column >= 0 ? (row[column] ?? "").trim() : "";
}

function stableEvidenceKey(sessionId: string, key: string): string | null {
  if (!sessionId) return null;
  return `s_${createHmac("sha256", key).update(sessionId).digest("hex").slice(0, 20)}`;
}

function safeRoute(value: string): string {
  if (!value) return "unknown";
  let pathname: string;
  try {
    pathname = new URL(value, "https://local.invalid").pathname;
  } catch {
    return "unknown";
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  const output: string[] = [];
  let previous = "";

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index].toLowerCase();
    if (index === 0 && LOCALES.has(segment)) {
      output.push(segment);
      previous = segment;
      continue;
    }
    if (DYNAMIC_ROUTE_PARENTS.has(previous)) {
      output.push(":id");
      previous = ":id";
      continue;
    }
    if (STATIC_ROUTE_SEGMENTS.has(segment)) {
      output.push(segment);
      previous = segment;
      continue;
    }
    output.push(":segment");
    previous = ":segment";
  }

  return `/${output.join("/")}`;
}

function safeCategory(value: string, allowed: readonly string[]): string {
  const normalized = value.trim().toLowerCase();
  return allowed.find((item) => normalized === item || normalized.startsWith(`${item} `)) ?? "other";
}

function parseInstant(value: string): { epoch: number | null; day: string | null; hour: string | null } {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { epoch: null, day: text, hour: null };
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) return { epoch: null, day: null, hour: null };
  const epoch = Date.parse(text);
  if (!Number.isFinite(epoch)) return { epoch: null, day: null, hour: null };

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epoch));
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return {
    epoch,
    day: `${values.year}-${values.month}-${values.day}`,
    hour: values.hour,
  };
}

function parseOffsetSeconds(value: string): number | null {
  const text = value.trim();
  const match = /^(?:(\d+):)?([0-5]?\d):([0-5]\d)(?:\.\d+)?$/.exec(text);
  if (!match) return null;
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function detectKind(headers: string[]): ExportKind {
  return findColumn(headers, HEADER_ALIASES.event) >= 0 ? "events" : "sessions";
}

export function auditClarityCsvExports(
  inputs: ClarityExportInput[],
  hmacKey: string,
): ClarityExportInventory {
  if (hmacKey.length < 32) throw new Error("Use a private HMAC key of at least 32 characters.");

  const sessions: SessionInventoryRow[] = [];
  const events: EventInventoryRow[] = [];
  const eventCounts: Record<string, number> = {};
  const startTimes = new Map<string, number>();
  const sessionTimes = new Map<string, { day: string | null; hourIstanbul: string | null }>();
  const sessionKeys = new Set<string>();
  let sessionsWithoutKey = 0;
  let sessionsWithoutDate = 0;
  let eventsWithoutKey = 0;
  let eventsWithoutDate = 0;
  let eventsWithOffset = 0;

  const parsedInputs = inputs.map((input) => {
    const rows = parseCsv(input.csv);
    if (rows.length === 0) return null;
    const headers = rows[0];
    const kind = input.kind ?? detectKind(headers);
    return { rows, headers, kind };
  }).filter((input): input is NonNullable<typeof input> => input !== null);

  for (const { rows, headers } of parsedInputs.filter((input) => input.kind === "sessions")) {
    const sessionIdColumn = findColumn(headers, HEADER_ALIASES.sessionId);
    const timeColumn = findColumn(headers, HEADER_ALIASES.start);
    const routeColumn = findColumn(headers, HEADER_ALIASES.route);
    const deviceColumn = findColumn(headers, HEADER_ALIASES.device);
    const browserColumn = findColumn(headers, HEADER_ALIASES.browser);
    const osColumn = findColumn(headers, HEADER_ALIASES.os);

    for (const row of rows.slice(1)) {
      const sessionId = cell(row, sessionIdColumn);
      const evidenceKey = stableEvidenceKey(sessionId, hmacKey);
      if (evidenceKey) sessionKeys.add(evidenceKey);
      else sessionsWithoutKey += 1;
      const route = safeRoute(cell(row, routeColumn));

      const time = parseInstant(cell(row, timeColumn));
      if (!time.day) sessionsWithoutDate += 1;
      if (evidenceKey) {
        if (time.epoch !== null) startTimes.set(evidenceKey, time.epoch);
        sessionTimes.set(evidenceKey, { day: time.day, hourIstanbul: time.hour });
      }
      sessions.push({
        evidenceKey,
        day: time.day,
        hourIstanbul: time.hour,
        route,
        device: safeCategory(cell(row, deviceColumn), ["desktop", "mobile", "tablet"]),
        browser: safeCategory(cell(row, browserColumn), [
          "chrome", "edge", "firefox", "opera", "safari", "webview",
        ]),
        os: safeCategory(cell(row, osColumn), [
          "android", "chromeos", "ios", "linux", "macos", "windows",
        ]),
      });
    }
  }

  for (const { rows, headers } of parsedInputs.filter((input) => input.kind === "events")) {
    const sessionIdColumn = findColumn(headers, HEADER_ALIASES.sessionId);
    const timeColumn = findColumn(headers, HEADER_ALIASES.time);
    const routeColumn = findColumn(headers, HEADER_ALIASES.route);
    const eventColumn = findColumn(headers, HEADER_ALIASES.event);
    for (const row of rows.slice(1)) {
      const sessionId = cell(row, sessionIdColumn);
      const evidenceKey = stableEvidenceKey(sessionId, hmacKey);
      if (!evidenceKey) eventsWithoutKey += 1;
      const route = safeRoute(cell(row, routeColumn));
      const rawEvent = cell(row, eventColumn);
      const eventType = SAFE_EVENT_LABELS.get(rawEvent.toLowerCase()) ??
        (/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(rawEvent) ? rawEvent : "<redacted>");
      const rawTime = cell(row, timeColumn);
      const instant = parseInstant(rawTime);
      const relativeOffset = parseOffsetSeconds(rawTime);
      const sessionStart = evidenceKey ? startTimes.get(evidenceKey) : undefined;
      const offsetSeconds = instant.epoch !== null && sessionStart !== undefined
        ? Math.max(0, Math.round((instant.epoch - sessionStart) / 1000))
        : relativeOffset;
      if (offsetSeconds !== null) eventsWithOffset += 1;
      const sessionStartTime = evidenceKey ? sessionTimes.get(evidenceKey) : undefined;
      if (!instant.day && !sessionStartTime?.day) eventsWithoutDate += 1;

      events.push({
        evidenceKey,
        day: instant.day ?? sessionStartTime?.day ?? null,
        hourIstanbul: instant.hour ?? sessionStartTime?.hourIstanbul ?? null,
        offsetSeconds,
        eventType,
        route,
      });
      eventCounts[eventType] = (eventCounts[eventType] ?? 0) + 1;
    }
  }

  return {
    sourceFiles: inputs.length,
    sessionRows: sessions.length,
    uniqueSessionKeys: sessionKeys.size,
    sessionsWithoutKey,
    sessionsWithoutDate,
    eventRows: events.length,
    eventsWithoutKey,
    eventsWithoutDate,
    eventsWithOffset,
    sessions,
    events,
    eventCounts: Object.fromEntries(Object.entries(eventCounts).sort(([a], [b]) => a.localeCompare(b))),
  };
}
