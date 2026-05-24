"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BankTransfersTableTools } from "./BankTransfersTableTools";
import { BankTransfersUploadsPanel } from "./BankTransfersUploadsPanel";

function ensureNode() {
  const h1 = document.querySelector("main h1");
  if (!h1 || !h1.textContent?.includes("التحويلات البنكية")) return null;
  const block = h1.closest("div.flex") as HTMLElement | null;
  const parent = block?.parentElement;
  if (!block || !parent) return null;
  let node = document.getElementById("bank-transfers-export-panel");
  if (!node) {
    node = document.createElement("div");
    node.id = "bank-transfers-export-panel";
    node.dir = "rtl";
  }
  if (node.parentElement !== parent || node.previousElementSibling !== block) {
    block.insertAdjacentElement("afterend", node);
  }
  return node;
}

function exportLink(status: string, queryString: string) {
  const params = new URLSearchParams(queryString);
  params.set("status", status);
  return `/api/admin/bank-transfers/export?${params.toString()}`;
}

export function BankTransfersExportPanel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [node, setNode] = useState<HTMLElement | null>(null);
  const active = pathname === "/dashboard/bank-transfers" || pathname.startsWith("/dashboard/bank-transfers/");

  useEffect(() => {
    if (!active) {
      setNode(null);
      return;
    }
    const refresh = () => setNode(ensureNode());
    refresh();
    const timer = window.setInterval(refresh, 700);
    return () => window.clearInterval(timer);
  }, [active, pathname]);

  if (!active || !node) return null;

  return (
    <>
      {createPortal(
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تصدير التحويلات البنكية</CardTitle>
            <CardDescription>تنزيل ملف CSV حسب الحالة والفلاتر الحالية قدر الإمكان.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm"><a href={exportLink("all", queryString)}>تصدير النتائج الحالية</a></Button>
              <Button asChild size="sm" variant="outline"><a href={exportLink("APPROVED", queryString)}>المعتمد</a></Button>
              <Button asChild size="sm" variant="outline"><a href={exportLink("PENDING_REVIEW", queryString)}>قيد المراجعة</a></Button>
              <Button asChild size="sm" variant="outline"><a href={exportLink("IGNORED", queryString)}>المستبعد</a></Button>
            </div>
          </CardContent>
        </Card>,
        node
      )}
      <BankTransfersUploadsPanel />
      <BankTransfersTableTools />
    </>
  );
}
