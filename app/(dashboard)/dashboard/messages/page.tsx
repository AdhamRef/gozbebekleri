"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, Send } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import InboundMessagesTab from "./_components/InboundMessagesTab";
import OutboundHistoryTab from "./_components/OutboundHistoryTab";

export default function MessagesPage() {
  return (
    <div className="min-h-0" dir="rtl">
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <PageHeader
          title="الرسائل"
          description="رسائل الزوار من نموذج التواصل، وسجل البريد والواتساب الصادر من القوالب."
          icon={Inbox}
        />

        <Tabs defaultValue="outbound" dir="rtl" className="w-full">
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="outbound" className="gap-2">
              <Send className="w-4 h-4" />
              سجل القوالب الصادرة
            </TabsTrigger>
            <TabsTrigger value="inbound" className="gap-2">
              <Inbox className="w-4 h-4" />
              رسائل واردة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbound" className="mt-6 focus-visible:outline-none">
            <InboundMessagesTab />
          </TabsContent>
          <TabsContent value="outbound" className="mt-6 focus-visible:outline-none">
            <OutboundHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
