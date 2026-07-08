import { ConnectionsPageClient } from "./_components/ConnectionsPageClient";
import { PlatformConnectionsMovedNotice } from "@/components/dashboard/PlatformConnectionsMovedNotice";

export const metadata = {
  title: "ربط المنصات والحسابات | لوحة التحكم",
};

export default function MarketingConnectionsPage() {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6">
        <PlatformConnectionsMovedNotice href="/dashboard/platform-connections/ad-accounts" label="فتح الحسابات الإعلانية" />
      </div>
      <ConnectionsPageClient />
    </>
  );
}
