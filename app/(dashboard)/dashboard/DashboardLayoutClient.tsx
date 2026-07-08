'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import {
  Heart, FolderOpen, Users, LogOut, Menu, X,
  PenLine, ImageIcon, Ticket, PieChart, Link2,
  Award, BarChart3, MessageSquare, Repeat, ScrollText,
  UserCircle,
  ChevronLeft, FileText, Megaphone, Plug, CreditCard,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { localeDirection } from "@/lib/locales";
import SessionProvider from '@/components/providers/SessionProvider';
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "react-hot-toast";
import { ConfettiProvider } from "@/components/providers/confetti-provider";
import { CurrencyProvider } from "@/context/CurrencyContext";
import CurrencySelector from "@/components/CurrencySelector";
import { CurrencyFromUrlSync } from "@/components/CurrencyFromUrlSync";
import { DashboardThemeProvider } from "@/context/DashboardThemeContext";
import { ViewUserProfileProvider } from "@/context/ViewUserProfileContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Session } from "next-auth";
import {
  userCanEnterDashboard,
  userHasDashboardPermission,
  pathToDashboardPermission,
  getFirstAllowedDashboardHref,
  type DashboardPermissionKey,
} from "@/lib/dashboard/permissions";
import {
  DASHBOARD_NAV_GROUPS,
  DASHBOARD_NAV_HREFS_ORDERED,
  dashboardHrefToPermissionKey,
} from "@/lib/dashboard/nav-config";
import { DashboardAutoEnhancements } from "./_components/DashboardAutoEnhancements";
import { ProjectEditorSectionsEnhancer } from "./_components/ProjectEditorSectionsEnhancer";
import { BankTransfersExportPanel } from "./_components/BankTransfersExportPanel";

function DashboardContent({
  children,
  locale = "ar",
}: {
  children: React.ReactNode;
  locale?: string;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Less-used groups start collapsed to keep the sidebar short.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({ "المحتوى": true, "الإدارة": true });
  const toggleGroup = (g: string) => setCollapsedGroups((prev) => ({ ...prev, [g]: !prev[g] }));
  const dir = localeDirection(locale);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (status !== "loading" && !hasChecked.current) {
      hasChecked.current = true;
      if (status === "unauthenticated") { router.replace("/ar/auth/signin"); return; }
      if (!userCanEnterDashboard(session?.user)) { router.replace("/"); return; }
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    if (!userCanEnterDashboard(session.user)) { router.replace("/"); return; }
    const required = pathToDashboardPermission(pathname);
    if (required && !userHasDashboardPermission(session.user, required)) {
      const fallback = getFirstAllowedDashboardHref(session.user, DASHBOARD_NAV_HREFS_ORDERED, dashboardHrefToPermissionKey);
      router.replace(fallback || "/");
    }
  }, [status, session, pathname, router]);

  const iconByKey: Partial<Record<DashboardPermissionKey, React.ReactNode>> = useMemo(() => ({
    revenue:    <PieChart    className="w-4 h-4 shrink-0" />,
    monthly:    <Repeat      className="w-4 h-4 shrink-0" />,
    referrals:  <Link2       className="w-4 h-4 shrink-0" />,
    bankTransfers: <CreditCard className="w-4 h-4 shrink-0" />,
    donors:     <Users       className="w-4 h-4 shrink-0" />,
    team:       <UserCircle  className="w-4 h-4 shrink-0" />,
    logs:       <ScrollText  className="w-4 h-4 shrink-0" />,
    badges:     <Award       className="w-4 h-4 shrink-0" />,
    messages:   <MessageSquare className="w-4 h-4 shrink-0" />,
    templates:  <FileText      className="w-4 h-4 shrink-0" />,
    campaigns:  <Heart       className="w-4 h-4 shrink-0" />,
    categories: <FolderOpen  className="w-4 h-4 shrink-0" />,
    blog:       <PenLine     className="w-4 h-4 shrink-0" />,
    slides:     <ImageIcon   className="w-4 h-4 shrink-0" />,
    ticker:     <Ticket      className="w-4 h-4 shrink-0" />,
    pixels:     <BarChart3   className="w-4 h-4 shrink-0" />,
    ads:        <Megaphone   className="w-4 h-4 shrink-0" />,
    platformConnections: <Plug className="w-4 h-4 shrink-0" />,
    generalSettings: <CreditCard className="w-4 h-4 shrink-0" />,
  }), []);

  const navigation = useMemo(() => {
    const u = session?.user;
    if (!u) return [];
    return DASHBOARD_NAV_GROUPS.map((section) => ({
      group: section.group,
      items: section.items
        .filter((item) => userHasDashboardPermission(u, item.key))
        .map((item) => ({ title: item.title, href: item.href, icon: iconByKey[item.key] ?? null })),
    })).filter((s) => s.items.length > 0);
  }, [session?.user, iconByKey]);

  // Live inbox badge (WhatsApp conversations needing a reply). Fetched client-side so SSR is not
  // blocked, and only when the user can see the inbox item. Fails gracefully to no badge.
  const INBOX_HREF = "/dashboard/operations/communication/inbox";
  const showInboxBadge = useMemo(() => navigation.some((s) => s.items.some((i) => i.href === INBOX_HREF)), [navigation]);
  const [inboxCount, setInboxCount] = useState(0);
  useEffect(() => {
    if (!showInboxBadge) return;
    let cancelled = false;
    fetch("/api/dashboard/operations/communication/inbox/badge", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j && typeof j.count === "number") setInboxCount(j.count); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [showInboxBadge]);

  const isActiveHref = (href: string) => {
    if (href === '/dashboard/referrals') return pathname === href || pathname.startsWith('/dashboard/referrals/');
    if (href === '/dashboard/link-generator') return pathname === href || pathname.startsWith('/dashboard/link-generator/');
    if (href === '/dashboard/monthly') return pathname === href || pathname.startsWith('/dashboard/monthly/');
    if (href === '/dashboard/bank-transfers') return pathname === href || pathname.startsWith('/dashboard/bank-transfers/');
    return pathname === href;
  };

  const user = session?.user;
  const userInitials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'A';

  if (status === "loading" || status === "unauthenticated" || !session || !userCanEnterDashboard(session.user)) {
    return <LoadingSkeleton />;
  }

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center px-4 border-b border-white/10 shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-white.png" alt="Logo" className="h-8 w-auto object-contain brightness-0 invert" />
        </Link>
        <button className="lg:hidden ms-auto text-white/60 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-3 sidebar-scroll">
        {navigation.map((section) => {
          const collapsed = collapsedGroups[section.group];
          return (
            <div key={section.group}>
              <button onClick={() => toggleGroup(section.group)} className="flex w-full items-center justify-between px-3 py-1 mb-1 text-[10px] uppercase tracking-widest font-semibold text-white/35 hover:text-white/60">
                <span>{section.group}</span>
                <ChevronLeft className={cn("h-3 w-3 transition-transform", collapsed ? "" : "-rotate-90")} />
              </button>
              {!collapsed ? (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActiveHref(item.href);
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setIsSidebarOpen(false)} className={cn("group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors", active ? "bg-white/12 text-white" : "text-white/75 hover:bg-white/8 hover:text-white")}>
                        <span className={cn("shrink-0", active ? "text-white" : "text-white/70 group-hover:text-white")}>{item.icon}</span>
                        <span className="truncate flex-1">{item.title}</span>
                        {item.href === INBOX_HREF && inboxCount > 0 ? (
                          <span className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white" aria-label={`${inboxCount} محادثات تحتاج رد`}>{inboxCount > 99 ? "99+" : inboxCount}</span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2.5 shrink-0 space-y-1.5">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/8">
          <div className="w-7 h-7 rounded-full bg-[#FA5D17] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
            {user?.image ? <img src={user.image} alt="" className="w-full h-full rounded-full object-cover" /> : userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-semibold truncate">{user?.name || 'Admin'}</p>
            <p className="text-white/70 text-[10px] truncate">{user?.email || ''}</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/' })} title="تسجيل خروج" className="shrink-0 text-white/50 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50" dir={dir}>
      <DashboardAutoEnhancements />
      <ProjectEditorSectionsEnhancer />
      <BankTransfersExportPanel />
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} aria-hidden />}

      <aside className={cn("fixed top-0 z-40 h-full w-[240px] flex flex-col transition-transform duration-300 ease-out", "bg-[#025EB8]", dir === "rtl" ? "right-0 border-l border-white/10" : "left-0 border-r border-white/10", "lg:translate-x-0", isSidebarOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full")}>
        <SidebarInner />
      </aside>

      <div className={cn("lg:hidden fixed top-0 left-0 right-0 z-20 h-14 flex items-center justify-between gap-2 px-3 sm:px-4", "bg-white border-b border-gray-200 shadow-sm")}>
        <img src="logo-white.png" alt="Logo" className="h-7 w-auto object-contain shrink-0" />
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <CurrencySelector showDefaultCurrencyOption onDark={false} />
          <button type="button" onClick={() => setIsSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"><Menu className="w-5 h-5" /></button>
        </div>
      </div>

      <main className={cn("flex-1 min-w-0 transition-all duration-300", "pt-14 lg:pt-0", dir === "rtl" ? "lg:mr-[240px]" : "lg:ml-[240px]")}>
        <div className="hidden lg:flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-[#025EB8] transition-colors font-medium">لوحة التحكم</Link>
            {pathname !== '/dashboard' && <><ChevronLeft className="w-3.5 h-3.5 text-gray-300" /><span className="text-gray-900 font-semibold capitalize">{pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ')}</span></>}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <CurrencySelector showDefaultCurrencyOption onDark={false} />
            <Link href="/" className="text-xs text-gray-500 hover:text-[#025EB8] transition-colors font-medium whitespace-nowrap" target="_blank">عرض الموقع ↗</Link>
          </div>
        </div>

        <div className="p-3 sm:p-4 lg:p-6 min-h-[calc(100vh-3.5rem)]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 min-h-full">{children}</div>
        </div>
      </main>
    </div>
  );
}

const LoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="flex flex-col items-center gap-4"><div className="w-10 h-10 border-4 border-gray-200 border-t-[#025EB8] rounded-full animate-spin" /><p className="text-sm text-gray-400 font-medium">جاري التحميل...</p></div></div>
);

export default function DashboardLayoutClient({
  children, session, messages, locale = "ar",
}: {
  children: React.ReactNode;
  session: Session | null;
  messages: Record<string, string | Record<string, string>>;
  locale?: string;
}) {
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <CurrencyProvider>
        <Suspense fallback={null}><CurrencyFromUrlSync /></Suspense>
        <SessionProvider session={session}>
          <ViewUserProfileProvider><DashboardThemeProvider><DashboardContent locale={locale}>{children}</DashboardContent></DashboardThemeProvider></ViewUserProfileProvider>
          <ConfettiProvider />
          <Toaster position="top-center" toastOptions={{
            style: { fontFamily: 'inherit', fontSize: '14px' },
            success: { iconTheme: { primary: '#025EB8', secondary: '#fff' } },
          }} />
        </SessionProvider>
      </CurrencyProvider>
      <Analytics />
      <SpeedInsights />
    </NextIntlClientProvider>
  );
}
