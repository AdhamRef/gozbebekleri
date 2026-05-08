"use client";

import * as React from "react";
import { Reader } from "@usewaypoint/email-builder";
import type { EmailDocument } from "./types";
import { defaultDocument } from "./types";
import { BlockList } from "./BlockList";
import { BlockInspector } from "./BlockInspector";

export interface EmailEditorProps {
  value: EmailDocument | null | undefined;
  onChange: (next: EmailDocument) => void;
}

export function EmailEditor({ value, onChange }: EmailEditorProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>("root");

  const doc = React.useMemo<EmailDocument>(() => value ?? defaultDocument(), [value]);

  return (
    <div
      className="grid gap-4 h-full min-h-[60vh]"
      style={{ gridTemplateColumns: "260px minmax(0, 1fr) 300px" }}
      dir="rtl"
    >
      <aside className="rounded-lg border border-border bg-card p-3 overflow-y-auto">
        <BlockList
          doc={doc}
          selectedId={selectedId}
          onChange={onChange}
          onSelect={setSelectedId}
        />
      </aside>

      <main className="rounded-lg border border-border bg-slate-100 overflow-y-auto p-4" dir="ltr">
        <div className="mx-auto max-w-[600px] bg-white rounded shadow-sm overflow-hidden">
          <Reader document={doc} rootBlockId="root" />
        </div>
      </main>

      <aside className="rounded-lg border border-border bg-card p-3 overflow-y-auto">
        <BlockInspector
          doc={doc}
          selectedId={selectedId}
          onChange={onChange}
          onSelect={setSelectedId}
        />
      </aside>
    </div>
  );
}
