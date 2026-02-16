import { getMessages } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import DashboardLayoutClient from "./DashboardLayoutClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const messages = await getMessages();
  const locale = "ar";

  return (
    <DashboardLayoutClient
      session={session}
      messages={(messages ?? {}) as Record<string, string | Record<string, string>>}
      locale={locale}
    >
      {children}
    </DashboardLayoutClient>
  );
}
