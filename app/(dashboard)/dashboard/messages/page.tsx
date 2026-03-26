"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "react-hot-toast";
import { Search, Loader2, MessageSquare, User, Mail, Globe, Calendar, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALE_LABELS } from "@/lib/locales";

const PAGE_SIZE = 10;

interface MessageRow {
  id: string;
  body: string;
  locale: string;
  userId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [localeFilter, setLocaleFilter] = useState<string>("all");
  const [hasUserFilter, setHasUserFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "body">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedMessage, setSelectedMessage] = useState<MessageRow | null>(null);

  const fetchMessages = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        params.set("limit", String(PAGE_SIZE));
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        if (search) params.set("search", search);
        if (localeFilter !== "all") params.set("locale", localeFilter);
        if (hasUserFilter === "yes") params.set("hasUser", "true");
        if (hasUserFilter === "no") params.set("hasUser", "false");
        const res = await axios.get(`/api/admin/messages?${params}`);
        const list = res.data?.messages ?? [];
        setMessages((prev) => (append ? [...prev, ...list] : list));
        setTotal(res.data?.pagination?.total ?? 0);
      } catch (err) {
        console.error("Error fetching messages:", err);
        toast.error("فشل في تحميل الرسائل");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, localeFilter, hasUserFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    fetchMessages(1, false);
  }, [search, localeFilter, hasUserFilter, sortBy, sortOrder, fetchMessages]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchMessages(next, true);
  };

  const hasMore = messages.length < total && !loadingMore;

  const localeLabel = (l: string) => LOCALE_LABELS[l as keyof typeof LOCALE_LABELS] ?? l;

  if (loading && messages.length === 0) {
    return (
      <div className="min-h-0" dir="rtl">
        <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
          <div className="h-10 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-12 bg-slate-200 rounded animate-pulse w-full max-w-2xl" />
          <div className="h-64 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0" dir="rtl">
      <div className="space-y-6 sm:space-y-8 p-0 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <header className="text-right">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            الرسائل
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            رسائل الزوار والمستخدمين من نموذج «أرسل لنا رسالة» في التذييل
          </p>
        </header>

        <Card className="border-border shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 justify-end">
              <Search className="w-4 h-4 shrink-0" />
              تصفية وبحث
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4" dir="rtl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="space-y-2 text-right">
                <label className="text-[11px] font-medium text-slate-500">بحث في النص</label>
                <Input
                  placeholder="بحث..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border-slate-200 bg-slate-50"
                />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-[11px] font-medium text-slate-500">اللغة</label>
                <Select value={localeFilter} onValueChange={setLocaleFilter}>
                  <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">الكل</SelectItem>
                    {Object.entries(LOCALE_LABELS).map(([code, label]) => (
                      <SelectItem key={code} value={code} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-right">
                <label className="text-[11px] font-medium text-slate-500">المرسل</label>
                <Select value={hasUserFilter} onValueChange={setHasUserFilter}>
                  <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">الكل</SelectItem>
                    <SelectItem value="yes" className="text-xs">مستخدم مسجل</SelectItem>
                    <SelectItem value="no" className="text-xs">زائر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-right">
                <label className="text-[11px] font-medium text-slate-500">ترتيب حسب</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as "createdAt" | "body")}>
                  <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt" className="text-xs">التاريخ</SelectItem>
                    <SelectItem value="body" className="text-xs">النص</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-right">
                <label className="text-[11px] font-medium text-slate-500">الاتجاه</label>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                  <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc" className="text-xs">تنازلي</SelectItem>
                    <SelectItem value="asc" className="text-xs">تصاعدي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right mb-4">
            الرسائل ({total})
          </h2>
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto" dir="rtl">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">الرسالة</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">المرسل</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">اللغة</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">التاريخ</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && messages.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                        </td>
                      </tr>
                    ) : messages.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          لا توجد رسائل مطابقة
                        </td>
                      </tr>
                    ) : (
                      messages.map((m) => (
                        <tr
                          key={m.id}
                          className={cn(
                            "border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                          )}
                        >
                          <td className="py-3 px-4 max-w-[240px]">
                            <p className="text-slate-800 truncate" title={m.body}>
                              {m.body}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            {m.user ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-slate-900 flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {m.user.name ?? "—"}
                                </span>
                                {m.user.email && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {m.user.email}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {m.guestName && (
                                  <span className="font-medium text-slate-700 flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />
                                    {m.guestName}
                                  </span>
                                )}
                                {m.guestEmail && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {m.guestEmail}
                                  </span>
                                )}
                                {!m.guestName && !m.guestEmail && (
                                  <span className="text-slate-400 text-xs">زائر</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <Globe className="w-3.5 h-3.5" />
                              {localeLabel(m.locale)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(m.createdAt).toLocaleDateString("ar-EG", {
                                dateStyle: "medium",
                              })}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-left">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                              onClick={() => setSelectedMessage(m)}
                            >
                              <Eye className="w-4 h-4" />
                              عرض
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <div className="p-4 border-t border-slate-100 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="gap-2"
                  >
                    {loadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    تحميل المزيد
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Full message popup – social post style */}
        <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
          <DialogContent hideCloseButton className="sm:max-w-md md:max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-xl bg-white dark:bg-slate-900" dir="rtl">
            {selectedMessage && (
              <>
                <DialogTitle className="sr-only">عرض الرسالة</DialogTitle>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 overflow-hidden">
                  {/* Post header – author */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <Avatar className="h-11 w-11 rounded-full ring-2 ring-white dark:ring-slate-800 shadow-sm">
                      <AvatarImage src={selectedMessage.user?.image ?? undefined} alt="" />
                      <AvatarFallback className="bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-sm font-semibold rounded-full">
                        {selectedMessage.user
                          ? (selectedMessage.user.name ?? selectedMessage.user.email ?? "?")[0].toUpperCase()
                          : (selectedMessage.guestName ?? selectedMessage.guestEmail ?? "ز")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {selectedMessage.user?.name ?? selectedMessage.guestName ?? "زائر"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {selectedMessage.user?.email ?? selectedMessage.guestEmail ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                      {localeLabel(selectedMessage.locale)}
                    </div>
                  </div>
                  {/* Post body */}
                  <div className="px-4 py-4">
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                      {selectedMessage.body}
                    </p>
                  </div>
                  {/* Post footer – time */}
                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700/80 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {new Date(selectedMessage.createdAt).toLocaleDateString("ar-EG", {
                      dateStyle: "long",
                    })}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
