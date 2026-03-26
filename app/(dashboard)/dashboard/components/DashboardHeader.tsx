"use client";

import Link from "next/link";

/**
 * Dashboard header bar above main content.
 * Use for breadcrumbs, quick links, or other dashboard-wide actions.
 */
export default function DashboardHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-border">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          لوحة التحكم
        </Link>
        {/* Add more breadcrumb or links here when needed */}
      </nav>
      <div className="flex items-center gap-2">
        {/* Reserved for future: e.g. "إضافة رابط", notifications, etc. */}
      </div>
    </header>
  );
}
