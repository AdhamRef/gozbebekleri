"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Mail, MessageCircle } from "lucide-react";
import { EmailTemplateList } from "./EmailTemplateList";
import { WhatsappTemplateList } from "./WhatsappTemplateList";

export default function TemplatesPageClient() {
  return (
    <div className="min-h-0" dir="rtl">
      <div className="space-y-6 sm:space-y-8 p-0 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <header className="text-right">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2 justify-end">
            <FileText className="w-6 h-6 text-[#025EB8]" />
            القوالب
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            صمّم قوالب البريد الإلكتروني والواتساب لإرسالها إلى المتبرعين مع دمج بياناتهم تلقائيًا.
          </p>
        </header>

        <Card className="border-border shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold text-slate-700 text-right">القوالب المحفوظة</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs defaultValue="email" dir="rtl">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="w-4 h-4" /> البريد
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="gap-2">
                  <MessageCircle className="w-4 h-4" /> واتساب
                </TabsTrigger>
              </TabsList>
              <TabsContent value="email" className="mt-6">
                <EmailTemplateList />
              </TabsContent>
              <TabsContent value="whatsapp" className="mt-6">
                <WhatsappTemplateList />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
