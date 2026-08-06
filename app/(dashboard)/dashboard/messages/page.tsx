"use client";

import Link from "next/link";
import { History, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import OutboundHistoryTab from "./_components/OutboundHistoryTab";

/**
 * سجل الرسائل — the outbound template send log.
 *
 * Previously two tabs. The inbound half moved to its own page at `/dashboard/inbox`: it is mail a
 * person has to read and reply to, while everything left here is delivery telemetry for automated
 * sends. With one tab remaining the Tabs wrapper only cost a click, so it is gone; the link across
 * stays, since someone who lands here looking for visitor mail needs a way over.
 */
export default function MessagesPage() {
  return (
    <div className="min-h-0" dir="rtl">
      <div className="mx-auto max-w-[1600px]">
        <PageHeader
          eyebrow="التواصل"
          title="سجل الرسائل الصادرة"
          description="أرشيف كل رسالة مُجهّزة أو مُرسَلة من القوالب عبر البريد والواتساب، مع الحالة والسبب."
          icon={History}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href="/dashboard/inbox">
                <Inbox className="h-4 w-4" />
                الرسائل الواردة
              </Link>
            </Button>
          }
        />
        <OutboundHistoryTab />
      </div>
    </div>
  );
}
