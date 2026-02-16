'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Heart,
  FolderOpen,
  Users,
  LogOut,
  Menu,
  X,
  PenLine,
  ImageIcon,
  Ticket,
  Sun,
  Moon,
  PieChart,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SessionProvider from '@/components/providers/SessionProvider';
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "react-hot-toast";
import { ConfettiProvider } from "@/components/providers/confetti-provider";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { DashboardThemeProvider, useDashboardTheme } from "@/context/DashboardThemeContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Session } from "next-auth";

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
  const { dark: darkMode, toggleDark } = useDashboardTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const hasChecked = useRef(false);

  useEffect(() => {
    if (status !== "loading" && !hasChecked.current) {
      hasChecked.current = true;
      if (status === "unauthenticated") {
        router.replace("/ar/auth/signin");
        return;
      }
      if (session?.user?.role !== "ADMIN") {
        router.replace("/");
        return;
      }
    }
  }, [session, status, router]);

  if (status === "loading") return <LoadingSkeleton />;
  if (status === "unauthenticated" || !session) return <LoadingSkeleton />;
  if (session.user.role !== "ADMIN") return <LoadingSkeleton />;

  const navigation = [
    {
      group: "الإدارة العامة",
      items: [
        { title: 'تحليل الإيرادات', icon: <PieChart className="w-5 h-5 shrink-0" />, href: '/dashboard' },
      ],
    },
    {
      group: "إدارة المحتوى",
      items: [
        { title: 'الحملات', icon: <Heart className="w-5 h-5 shrink-0" />, href: '/dashboard/campaigns' },
        { title: 'الأقسام', icon: <FolderOpen className="w-5 h-5 shrink-0" />, href: '/dashboard/categories' },
        { title: 'المدونة', icon: <PenLine className="w-5 h-5 shrink-0" />, href: '/dashboard/blog' },
      ],
    },
    {
      group: "إعدادات الهوية",
      items: [
        { title: 'شرائح الهيرو', icon: <ImageIcon className="w-5 h-5 shrink-0" />, href: '/dashboard/slides' },
        { title: 'إعدادات التيكر', icon: <Ticket className="w-5 h-5 shrink-0" />, href: '/dashboard/ticker' },
      ],
    },
    {
      group: "إدارة المستخدمين",
      items: [
        { title: 'المستخدمين', icon: <Users className="w-5 h-5 shrink-0" />, href: '/dashboard/users' },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row transition-colors duration-300 bg-gray-100 dark:bg-slate-950" dir={dir}>
      {/* Mobile: menu button + safe area */}
      <div className="lg:hidden fixed top-0 right-0 left-0 z-50 flex items-center justify-between h-14 px-4 bg-background dark:bg-slate-900 border-b border-border shadow-sm">
        <h2 className="text-base font-semibold text-foreground truncate">
          لوحة التحكم
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDark}
            className="text-muted-foreground hover:text-foreground"
            aria-label={darkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="shrink-0"
            aria-label={isSidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar: drawer on mobile, fixed on lg */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-40 h-full w-[min(20rem,85vw)] max-w-[20rem] lg:w-72 lg:max-w-none transition-transform duration-300 ease-out flex flex-col",
          "bg-card dark:bg-slate-900 border-l border-border shadow-xl",
          "lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Sidebar header (visible on desktop; mobile uses top bar) */}
        <div className="hidden lg:flex h-16 lg:h-20 items-center justify-between px-4 lg:px-6 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground truncate">
            لوحة التحكم
          </h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleDark}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label={darkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 lg:py-6 lg:px-4 space-y-6 lg:space-y-8">
          {navigation.map((section) => (
            <div key={section.group}>
              <p className="text-xs uppercase tracking-widest px-3 mb-2 lg:mb-3 font-semibold text-muted-foreground">
                {section.group}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-xl text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/15 text-primary dark:bg-indigo-500/20 dark:text-indigo-300"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className={cn("shrink-0", isActive ? "text-primary dark:text-indigo-400" : "")}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3 lg:p-4 shrink-0">
          <Button
            onClick={() => signOut({ callbackUrl: '/' })}
            variant="ghost"
            className="w-full justify-center gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            تسجيل خروج
          </Button>
        </div>
      </aside>

      {/* Main content: full width on mobile with top padding for header */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0 lg:mr-72 transition-all duration-300">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 min-h-screen">
          <div className="rounded-xl sm:rounded-2xl shadow-sm dark:shadow-none border border-border bg-card text-card-foreground p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-8rem)] lg:min-h-[calc(100vh-4rem)] transition-colors duration-300 overflow-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

const LoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-muted/50">
    <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
  </div>
);

export default function DashboardLayoutClient({
  children,
  session,
  messages,
  locale = "ar",
}: {
  children: React.ReactNode;
  session: Session | null;
  messages: Record<string, string | Record<string, string>>;
  locale?: string;
}) {
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <CurrencyProvider>
        <SessionProvider session={session}>
          <DashboardThemeProvider>
            <DashboardContent locale={locale}>
              {children}
            </DashboardContent>
          </DashboardThemeProvider>
          <ConfettiProvider />
          <Toaster position="top-center" />
        </SessionProvider>
      </CurrencyProvider>
      <Analytics />
      <SpeedInsights />
    </NextIntlClientProvider>
  );
}
