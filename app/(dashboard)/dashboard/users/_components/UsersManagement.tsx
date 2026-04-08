"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";
import { LOCALE_LABELS } from "@/lib/locales";
import {
  Users,
  Search,
  Pencil,
  ChevronDown,
  Loader2,
  Receipt,
  BarChart3,
  MoreHorizontal,
  UserCircle,
  Mail,
  Globe,
  Phone,
  Calendar,
  Hash,
  Award,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import { DASHBOARD_PERMISSION_ROWS } from "@/lib/dashboard/nav-config";

const PAGE_SIZE = 10;

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  dashboardPermissions?: string[];
  preferredLang: string | null;
  country: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  totalDonationsCount: number;
  totalDonatedAmount: number;
  totalDonatedAmountUSD: number;
  lastDonationAt: string | null;
  badgeIds: string[];
}

interface BadgeOption {
  id: string;
  name: string;
  translatedName?: string;
  color: string;
}

type Scope = "donors" | "team";

export default function UsersManagement({ scope }: { scope: Scope }) {
  const { data: session } = useSession();
  const isFullAdmin = session?.user?.role === "ADMIN";
  const canOpenRevenue = userHasDashboardPermission(session?.user, "revenue");
  const { convertToCurrency } = useCurrency();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [viewUser, setViewUser] = useState<UserRow | null>(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [preferredLangFilter, setPreferredLangFilter] = useState<string>("all");
  const [badgeFilter, setBadgeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "createdAt" | "name" | "email" | "donationsCount" | "totalDonated" | "role"
  >("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [badges, setBadges] = useState<BadgeOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const router = useRouter();

  const fetchUsers = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams();
        params.set("scope", scope);
        params.set("page", String(pageNum));
        params.set("limit", String(PAGE_SIZE));
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        if (search) params.set("search", search);
        if (preferredLangFilter && preferredLangFilter !== "all")
          params.set("preferredLang", preferredLangFilter);
        if (scope === "donors" && badgeFilter && badgeFilter !== "all")
          params.set("badgeId", badgeFilter);
        const res = await axios.get(`/api/users?${params}`);
        const list = res.data?.users ?? [];
        setUsers((prev) => (append ? [...prev, ...list] : list));
        setTotal(res.data?.pagination?.total ?? 0);
      } catch (err) {
        console.error("Error fetching users:", err);
        toast.error("فشل في تحميل المستخدمين");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [scope, search, preferredLangFilter, badgeFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
    fetchUsers(1, false);
  }, [search, preferredLangFilter, badgeFilter, sortBy, sortOrder, fetchUsers]);

  useEffect(() => {
    if (scope !== "donors") return;
    axios
      .get("/api/admin/badges?locale=ar")
      .then((res) => {
        setBadges(res.data?.badges ?? []);
      })
      .catch(() => {});
  }, [scope]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchUsers(next, true);
  };

  const handleEditClick = (user: UserRow) => {
    setSelectedUser({ ...user });
    setEditPermissions(user.dashboardPermissions ?? []);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
    setEditPermissions([]);
  };

  const toggleEditPermission = (key: string) => {
    setEditPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleUserAuthoritySave = async () => {
    if (!selectedUser) return;
    if (selectedUser.role === "STAFF" && editPermissions.length === 0) {
      toast.error("اختر قسمًا واحدًا على الأقل من لوحة التحكم لعضو الطاقم");
      return;
    }
    try {
      const payload: { role: string; dashboardPermissions?: string[] } = {
        role: selectedUser.role,
      };
      if (selectedUser.role === "STAFF") {
        payload.dashboardPermissions = editPermissions;
      }
      await axios.put(`/api/users/${selectedUser.id}`, payload);
      toast.success("تم حفظ الصلاحيات بنجاح");
      if (scope === "team") {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedUser.id
              ? {
                  ...u,
                  role: selectedUser.role,
                  dashboardPermissions:
                    selectedUser.role === "STAFF" ? [...editPermissions] : [],
                }
              : u
          )
        );
      } else {
        fetchUsers(1, false);
        setPage(1);
      }
      handleDialogClose();
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("فشل في تحديث المستخدم");
    }
  };

  const pageTitle =
    scope === "donors" ? "المتبرعين" : "فريق العمل";
  const pageSubtitle =
    scope === "donors"
      ? "عرض المتبرعين، الشارات، والتبرعات (تعديل الأدوار للمدير فقط)"
      : "المدراء وأعضاء الطاقم — المدراء يظهرون أولًا؛ لا يظهر حسابك الحالي في القائمة";

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllDisplayed = (checked: boolean) => {
    if (checked) setSelectedUserIds(new Set(users.map((u) => u.id)));
    else setSelectedUserIds(new Set());
  };

  const isAllDisplayedSelected = users.length > 0 && users.every((u) => selectedUserIds.has(u.id));
  const isSomeDisplayedSelected = users.some((u) => selectedUserIds.has(u.id));

  const formatMoney = (n: number) => {
    const r = convertToCurrency(n);
    if (r?.convertedValue != null && r?.currency) {
      const sym = r.currency === "USD" ? "$" : r.currency === "EUR" ? "€" : r.currency === "GBP" ? "£" : r.currency;
      return sym + " " + (typeof r.convertedValue === "number" ? r.convertedValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "0");
    }
    return "$" + (typeof n === "number" ? n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "0");
  };

  const hasMore = users.length < total && !loadingMore;

  if (loading && users.length === 0) {
    return (
      <div className="min-h-0" dir="rtl">
        <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
          <div className="h-10 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-slate-200 animate-pulse" />
            ))}
          </div>
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
            {pageTitle}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {pageSubtitle}
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border shadow-sm" dir="rtl">
            <div className="p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-lg shrink-0 bg-[#FA5D17]/8 text-[#FA5D17] border border-[#FA5D17]/20">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-medium text-slate-500">إجمالي المستخدمين</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{total}</p>
              </div>
            </div>
          </Card>
          <Card className="border border-border shadow-sm" dir="rtl">
            <div className="p-5 flex items-start gap-4">
              <div className="p-2.5 rounded-lg shrink-0 bg-[#025EB8] text-white border border-gray-200">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-medium text-slate-500">المستخدمين المعروضين</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums">{users.length}</p>
              </div>
            </div>
          </Card>
        </section>

        <Card className="border-border shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 justify-end">
              <Search className="w-4 h-4 shrink-0" />
              تصفية وبحث
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4" dir="rtl">
            <div
              className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-4",
                scope === "donors" ? "lg:grid-cols-5" : "lg:grid-cols-4"
              )}
            >
              <div className="space-y-2 text-right">
                <label className="text-[11px] font-medium text-slate-500">بحث (اسم أو بريد)</label>
        <Input
                  placeholder="بحث..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border-slate-200 bg-slate-50"
        />
      </div>
              {scope === "donors" && (
              <div className="space-y-2 text-right">
                <label className="text-[11px] font-medium text-slate-500">الشارة</label>
                <Select value={badgeFilter} onValueChange={setBadgeFilter}>
                  <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">الكل</SelectItem>
                    {badges.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: b.color }} />
                        {b.translatedName || b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}
              <div className="space-y-2 text-right">
                <label className="text-[11px] font-medium text-slate-500">اللغة المفضلة</label>
                <Select value={preferredLangFilter} onValueChange={setPreferredLangFilter}>
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
                <label className="text-[11px] font-medium text-slate-500">ترتيب حسب</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt" className="text-xs">تاريخ التسجيل</SelectItem>
                    <SelectItem value="name" className="text-xs">الاسم</SelectItem>
                    <SelectItem value="email" className="text-xs">البريد</SelectItem>
                    {scope === "team" && (
                      <SelectItem value="role" className="text-xs">الدور (مدير ثم طاقم)</SelectItem>
                    )}
                    <SelectItem value="donationsCount" className="text-xs">عدد التبرعات</SelectItem>
                    <SelectItem value="totalDonated" className="text-xs">إجمالي التبرعات</SelectItem>
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
            {scope === "donors" ? "قائمة المتبرعين" : "قائمة فريق العمل"}
          </h2>
          <Card className="border-border shadow-sm">
            {selectedUserIds.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50/80" dir="rtl">
                <span className="text-sm text-slate-700">
                  تم اختيار {selectedUserIds.size} مستخدم
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUserIds(new Set())}
                  >
                    إلغاء التحديد
                  </Button>
                  {/* Future: إرسال بريد، تصدير، إلخ */}
                </div>
              </div>
            )}
            <CardContent className="p-0">
              <div className="overflow-x-auto" dir="rtl">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-right py-3 px-2 w-10">
                        <Checkbox
                          checked={isAllDisplayedSelected}
                          onCheckedChange={(checked: boolean | "indeterminate") => selectAllDisplayed(checked === true)}
                          aria-label="تحديد الكل"
                        />
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700 min-w-[130px]">الاسم</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">البريد</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">الدور</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">اللغة المفضلة</th>
                      {scope === "donors" && (
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">الشارات</th>
                      )}
                      {scope === "team" && (
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">أقسام لوحة التحكم</th>
                      )}
                      {scope === "donors" && (
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">عدد التبرعات</th>
                      )}
                      {scope === "donors" && (
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">إجمالي التبرعات</th>
                      )}
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">التسجيل</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && users.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500">
                          لا يوجد مستخدمين مطابقين
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr
                          key={u.id}
                          className={cn(
                            "border-b border-slate-100 hover:bg-slate-50/60 transition-colors",
                            selectedUserIds.has(u.id) && "bg-slate-50/80"
                          )}
                        >
                          <td className="py-3 px-2">
                            <Checkbox
                              checked={selectedUserIds.has(u.id)}
                              onCheckedChange={() => toggleSelectUser(u.id)}
                              aria-label={`تحديد ${u.name || u.email}`}
                            />
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 min-w-[130px] whitespace-normal">{u.name ?? "—"}</td>
                          <td className="py-3 px-4 text-slate-600 truncate max-w-[250px] text-xs">{u.email ?? "—"}</td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded-full text-xs",
                                u.role === "ADMIN"
                                  ? "bg-[#FA5D17]/8 text-[#FA5D17]"
                                  : u.role === "STAFF"
                                    ? "bg-[#025EB8] text-white"
                                    : "bg-slate-100 text-slate-600"
                              )}
                            >
                              {u.role === "ADMIN"
                                ? "مدير"
                                : u.role === "STAFF"
                                  ? "طاقم"
                                  : "متبرع"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {LOCALE_LABELS[u.preferredLang as keyof typeof LOCALE_LABELS] ?? "—"}
                          </td>
                          {scope === "donors" && (
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {(u.badgeIds ?? []).map((bid) => {
                                const badge = badges.find((b) => b.id === bid);
                                if (!badge) return null;
                                return (
                                  <span
                                    key={bid}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white border border-white/20"
                                    style={{ backgroundColor: badge.color }}
                                    title={badge.translatedName || badge.name}
                                  >
                                    {badge.translatedName || badge.name}
                                  </span>
                                );
                              })}
                              {(u.badgeIds ?? []).length === 0 && <span className="text-slate-400">—</span>}
                            </div>
                          </td>
                          )}
                          {scope === "team" && (
                          <td className="py-3 px-4">
                            {u.role === "ADMIN" ? (
                              <span className="text-xs text-[#FA5D17] bg-[#FA5D17]/8 px-2 py-1 rounded-md">كل الأقسام</span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {(u.dashboardPermissions ?? []).map((key) => {
                                  // if (key === "users") {
                                  //   return (
                                  //     <span
                                  //       key="legacy"
                                  //       className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700"
                                  //     >
                                  //       مستخدمين (قديم)
                                  //     </span>
                                  //   );
                                  // }
                                  const row = DASHBOARD_PERMISSION_ROWS.find((r) => r.key === key);
                                  if (!row) return null;
                                  return (
                                    <span
                                      key={key}
                                      className="inline-block px-2 py-0.5 rounded text-xs bg-[#025EB8] text-white"
                                    >
                                      {row.title}
                                    </span>
                                  );
                                })}
                                {(u.dashboardPermissions ?? []).length === 0 && (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </div>
                            )}
                          </td>
                          )}
                          {scope === "donors" && (
                          <td className="py-3 px-4 font-medium text-slate-800">{u.totalDonationsCount}</td>
                          )}
                          {scope === "donors" && (
                          <td className="py-3 px-4 font-medium text-slate-800" dir="ltr">
                            {formatMoney(u.totalDonatedAmountUSD)}
                          </td>
                          )}
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString("ar-EG", { dateStyle: "medium" })}
                          </td>
                          <td className="py-3 px-4 text-left">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1 rounded-full">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="min-w-[160px]">
                              <DropdownMenuItem onClick={() => setViewUser(u)}>
                                  <UserCircle className="w-4 h-4 me-2" />
                                  عرض الملف
                                </DropdownMenuItem>
                                {canOpenRevenue && (
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard?userId=${u.id}`)}>
                                    <BarChart3 className="w-4 h-4 me-2" />
                                    تحليل تبرعات
                                  </DropdownMenuItem>
                                )}
                                {scope === "team" &&
                                  isFullAdmin &&
                                  (u.role === "STAFF" || u.role === "ADMIN") && (
                                  <DropdownMenuItem onClick={() => handleEditClick(u)}>
                                    <Pencil className="w-4 h-4 me-2" />
                                    تعديل الصلاحيات
                                  </DropdownMenuItem>
                                )}
                                {scope === "donors" &&
                                  u.role === "DONOR" &&
                                  isFullAdmin && (
                                  <DropdownMenuItem onClick={() => handleEditClick(u)}>
                                    <Pencil className="w-4 h-4 me-2" />
                                    تعديل الصلاحيات
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4 rotate-180" />}
                    عرض المزيد
                  </Button>
                </div>
              )}
              {total > 0 && (
                <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100 text-right">
                  عرض {users.length} من {total} مستخدم
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogOverlay className="fixed inset-0 bg-black/50" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-lg max-h-[min(90vh,640px)] overflow-y-auto p-4 sm:p-6 transform -translate-x-1/2 -translate-y-1/2 bg-card text-card-foreground border border-border rounded-lg shadow-lg" dir="rtl">
          <DialogTitle className="text-lg font-bold text-foreground">تعديل الدور والصلاحيات</DialogTitle>
          {selectedUser && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                {selectedUser.name ?? "—"} — {selectedUser.email ?? "—"}
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">الدور</label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(v) => {
                    setSelectedUser({ ...selectedUser, role: v });
                    if (v !== "STAFF") setEditPermissions([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DONOR">متبرع</SelectItem>
                    <SelectItem value="STAFF">طاقم (لوحة تحكم محدودة)</SelectItem>
                    <SelectItem value="ADMIN">مدير (كل الأقسام)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedUser.role === "STAFF" && (
                <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/40">
                  <p className="text-sm font-medium">أقسام لوحة التحكم</p>
                  <p className="text-xs text-muted-foreground">
                    فعّل كل قسم يحق لهذا المستخدم الدخول إليه. بدون تفعيل لا يظهر في القائمة الجانبية.
                  </p>
                  <div className="grid gap-2 max-h-56 overflow-y-auto pe-1">
                    {DASHBOARD_PERMISSION_ROWS.map((row) => (
                      <label
                        key={row.key}
                        className="flex items-start gap-2 text-sm cursor-pointer rounded-md p-2 hover:bg-muted/80"
                      >
                        <Checkbox
                          checked={editPermissions.includes(row.key)}
                          onCheckedChange={() => toggleEditPermission(row.key)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium">{row.title}</span>
                          <span className="text-muted-foreground text-xs block">{row.group}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {selectedUser.role === "ADMIN" && (
                <p className="text-xs text-muted-foreground">
                  المدير يملك صلاحية جميع أقسام لوحة التحكم تلقائيًا.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  إلغاء
                </Button>
                <Button onClick={handleUserAuthoritySave}>حفظ</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* عرض الملف — بطاقة بيانات المستخدم كاملة */}
      <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogOverlay className="fixed inset-0 bg-black/30" />
        <DialogContent
          className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl p-0 transform -translate-x-1/2 -translate-y-1/2 border border-border rounded-xl shadow-xl bg-card"
          {...({ closeClassName: "left-4 right-auto text-white hover:text-white opacity-90 hover:opacity-100" } as React.ComponentProps<typeof DialogContent>)}
          dir="rtl"
          aria-labelledby="view-user-title"
        >
          {viewUser && (
            <>
              <DialogTitle id="view-user-title" className="sr-only">ملف المستخدم — {viewUser.name ?? viewUser.email ?? viewUser.id}</DialogTitle>
              <div className="rounded-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 text-white px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                      {viewUser.image ? (
                        <img src={viewUser.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-8 h-8 text-white/80" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-bold truncate">{viewUser.name || "—"}</h2>
                      <p className="text-white/80 text-sm truncate">{viewUser.email || "—"}</p>
                      <span className={cn(
                        "inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium",
                        viewUser.role === "ADMIN"
                          ? "bg-[#FA5D17]/8/90 text-white"
                          : viewUser.role === "STAFF"
                            ? "bg-[#025EB8]/90 text-white"
                            : "bg-white/20 text-white"
                      )}>
                        {viewUser.role === "ADMIN"
                          ? "مدير"
                          : viewUser.role === "STAFF"
                            ? "طاقم"
                            : "متبرع"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4 bg-background">
                  <div className="grid grid-cols-[1.6fr_1fr] gap-4">
                    {/* الحساب */}
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                        <UserCircle className="w-4 h-4" /> الحساب
                      </h3>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground shrink-0">البريد:</span>
                        <span className="font-medium truncate" title={viewUser.email ?? undefined}>{viewUser.email ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground shrink-0">اللغة:</span>
                        <span className="font-medium">{LOCALE_LABELS[viewUser.preferredLang as keyof typeof LOCALE_LABELS] ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground shrink-0">الدولة:</span>
                        <span className="font-medium">{viewUser.country ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground shrink-0">الهاتف:</span>
                        <span className="font-medium dir-ltr">{viewUser.phone ?? "—"}</span>
                      </div>
                    </div>

                    {/* التبرعات */}
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                        <Receipt className="w-4 h-4" /> التبرعات
                      </h3>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">عدد التبرعات</span>
                          <span className="font-medium">{viewUser.totalDonationsCount ?? "—"}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">الإجمالي (USD)</span>
                          <span className="font-medium dir-ltr">{viewUser.totalDonatedAmountUSD != null ? formatMoney(viewUser.totalDonatedAmountUSD) : "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                      الأدوار والصلاحيات
                    </h3>
                    <p className="text-sm">
                      <span className="text-muted-foreground">الدور: </span>
                      <span className="font-medium">
                        {viewUser.role === "ADMIN"
                          ? "مدير — وصول كامل لجميع أقسام لوحة التحكم"
                          : viewUser.role === "STAFF"
                            ? "عضو طاقم — وصول جزئي حسب الأقسام أدناه"
                            : "متبرع — حساب عام بدون لوحة تحكم إدارية"}
                      </span>
                    </p>
                    {viewUser.role === "STAFF" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(viewUser.dashboardPermissions ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            لا توجد أقسام مفعّلة
                          </span>
                        ) : (
                          (viewUser.dashboardPermissions ?? []).map((key) => {
                            // if (key === "users") {
                            //   return (
                            //     <span
                            //       key="legacy-users"
                            //       className="inline-flex px-2.5 py-1 rounded-full text-xs bg-slate-200 text-slate-800"
                            //     >
                            //       مستخدمين (ترميز قديم)
                            //     </span>
                            //   );
                            // }
                            const row = DASHBOARD_PERMISSION_ROWS.find((r) => r.key === key);
                            if (!row) return null;
                            return (
                              <span
                                key={key}
                                className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-[#025EB8] text-white"
                              >
                                {row.title}
                              </span>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* التواريخ: تسجيل، آخر تبرع، آخر تحديث */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4" /> التواريخ
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">تاريخ التسجيل</p>
                        <p className="font-medium mt-0.5">{new Date(viewUser.createdAt).toLocaleDateString("ar-EG", { dateStyle: "medium" })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">آخر تبرع</p>
                        <p className="font-medium mt-0.5">
                          {viewUser.lastDonationAt ? new Date(viewUser.lastDonationAt).toLocaleDateString("ar-EG", { dateStyle: "medium" }) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">آخر تحديث</p>
                        <p className="font-medium mt-0.5">{new Date(viewUser.updatedAt).toLocaleDateString("ar-EG", { dateStyle: "medium" })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border">
                      <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-sm font-mono truncate" title={viewUser.id}>{viewUser.id}</span>
                    </div>
                  </div>

                  {/* الشارات */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4" /> الشارات
                    </h3>
                    {(viewUser.badgeIds ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {viewUser.badgeIds.map((bid) => {
                          const badge = badges.find((b) => b.id === bid);
                          if (!badge) return null;
                          return (
                            <span key={bid} className="inline-flex px-2.5 py-1 rounded-full text-sm font-medium text-white" style={{ backgroundColor: badge.color }}>
                              {badge.translatedName || badge.name}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
