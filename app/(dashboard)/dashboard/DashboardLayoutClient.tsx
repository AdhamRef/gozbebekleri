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
import { ProjectLocaleSlugEditor } from "./_components/ProjectLocaleSlugEditor";
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
    const run = async () => {
      try {
        const r = await fetch('/api/communication/inbox/summary', { cache: 'no-store' });
        const data = await r.json();
        if (!cancelled) setInboxCount(Number(data?.unreadCount ?? 0));
      } catch { if (!cancelled) setInboxCount(0); }
    };
    run();
    const t = setInterval(run, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [showInboxBadge]);

  const handleNavigation = (href: string) => {
    setIsSidebarOpen(false);
    router.push(href);
  };

  if (status === 'loading') return <LoadingSkeleton />;
  const user = session?.user;
  const userInitials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase();

  const SidebarInner = () => (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-white/10 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
            <Heart className="w-6 h-6 text-[#025EB8]" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Gözbebekleri</h2>
            <p className="text-white/70 text-[11px]">لوحة الإدارة</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {navigation.map((section) => {
          const collapsed = collapsedGroups[section.group] ?? false;
          return (
          <div key={section.group} className="space-y-1">
            <button type="button" onClick={() => toggleGroup(section.group)} className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold text-white/60 uppercase tracking-wider hover:text-white/80">
              <span>{section.group}</span>
              <ChevronLeft className={cn("w-3 h-3 transition-transform", collapsed ? "rotate-0" : "-rotate-90")} />
            </button>
            {!collapsed && section.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const isInbox = item.href === INBOX_HREF;
              return (
                <button key={item.href} onClick={() => handleNavigation(item.href)} className={cn("w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200", active ? "bg-white text-[#025EB8] shadow-lg" : "text-white/80 hover:bg-white/10 hover:text-white")}>
                  <span className="flex items-center gap-3 min-w-0">{item.icon}<span className="truncate">{item.title}</span></span>
                  {isInbox && inboxCount > 0 && <span className={cn("min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center", active ? "bg-[#025EB8] text-white" : "bg-red-500 text-white")}>{inboxCount > 99 ? '99+' : inboxCount}</span>}
                </button>
              );
            })}
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
      <ProjectLocaleSlugEditor />
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
