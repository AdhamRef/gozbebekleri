"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users,
  DollarSign,
  Heart,
  FolderTree,
  Repeat,
  Calendar,
  Receipt,
  Target,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  ChevronDown,
  Loader2,
  HandCoins,
  Percent,
} from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { formatUtcCalendarMonthLong } from "@/lib/admin/current-calendar-month-utc";
import { StatsMetricCard } from "@/components/dashboard/StatsMetricCard";
import { getDashboardChartPeriodLabelAr } from "@/lib/dashboard/chart-period-label-ar";

interface ChartDataPoint {
  date: string;
  amountUSD: number;
  count: number;
  amountOneTime: number;
  countOneTime: number;
  amountMonthly: number;
  countMonthly: number;
  amountFailed: number;
  countFailed: number;
  teamSupport: number;
  fees: number;
}

interface Category {
  id: string;
  name: string;
}

interface CampaignOption {
  id: string;
  title: string;
  categoryId: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface DonationRow {
  id: string;
  totalAmount: number;
  amount: number;
  amountUSD: number;
  currency: string;
  teamSupport: number;
  fees: number;
  type: string;
  status: string;
  provider?: string | null;
  providerErrorMessage?: string | null;
  createdAt: string;
  donor: { id: string; name: string | null; email: string };
  campaigns: { id: string; title: string }[];
  categories: { id: string; name: string }[];
  referral: { id: string; code: string; name?: string | null } | null;
}

interface DashboardStats {
  totalCampaigns: number;
  totalCategories: number;
  totalDonations: number;
  totalUsers: number;
  totalAmount: number;
  allTimeRevenue?: number;
  /** Sum of all PAID donations (USD) — ignores period / category / campaign filters */
  paidRevenueAllTimeUnfiltered?: number;
  paidCount?: number;
  failedCount?: number;
  pendingCount?: number;
  failedTotalAmount?: number;
  pendingTotalAmount?: number;
  oneTimeCount: number;
  monthlyCount: number;
  activeMonthlyCount: number;
  monthlyStoppedCount?: number;
  activeMonthlyAmountUSD?: number;
  monthlyStoppedAmountUSD?: number;
  monthlyRecurringRevenue: number;
  thisMonthRevenue: number;
  oneTimeTotalAmount?: number;
  monthlyTotalAmount?: number;
  campaignDonationsTotal: number;
  categoryDonationsTotal: number;
  campaignDonationsCount?: number;
  categoryDonationsCount?: number;
  teamSupportTotal?: number;
  feesTotal?: number;
  recentDonations: Array<{
    id: string;
    amount: number;
    currency: string;
    donorName: string;
    type: string;
    status?: string;
    provider?: string | null;
    campaignTitle: string | null;
    categoryName: string | null;
    createdAt: string;
  }>;
}

type ChartViewType = "bar" | "line" | "area";
type ChartPeriod = "day" | "week" | "month" | "all" | "custom";
type ChartMetric = "amount" | "teamSupport" | "fees";
type StatCardSet = "revenue" | "overview" | "breakdown";

const PERIOD_LABELS: Record<ChartPeriod, string> = {
  day: "يوم",
  week: "أسبوع",
  month: "شهر",
  all: "كل الوقت",
  custom: "مخصص",
};

const CHART_COLORS = {
  primary: "#2563eb",
  primaryLight: "#93c5fd",
  secondary: "#1d4ed8",
  grid: "#e2e8f0",
  text: "#334155",
};

/** Display symbols aligned with `CurrencySelector` / exchange API */
const DASHBOARD_CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  TRY: "₺",
  SAR: "﷼",
  AED: "د.إ",
  KWD: "د.ك",
  EGP: "EGP ",
  QAR: "﷼",
  BHD: "ب.د",
};

const PAGE_SIZE = 10;

/** Returns { start, end } in YYYY-MM-DD for the donations API; null = no filter (all time) */
function getDonationsDateRange(
  period: ChartPeriod,
  dateFrom: string,
  dateTo: string
): { start: string | null; end: string | null } {
  if (period === "all") return { start: null, end: null };
  if (dateFrom && dateTo) return { start: dateFrom, end: dateTo };
  const end = new Date();
  const start = new Date(end);
  const days = period === "day" ? 1 : period === "week" ? 7 : 30; // month = 30 days
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function DashboardPage() {
  const locale = useLocale() as string;
  const thisMonthRevenueTitle = `إيرادات شهر ${formatUtcCalendarMonthLong(new Date(), locale || "ar")}`;
  const searchParams = useSearchParams();
  const { convertToCurrency, getSelectedCurrency } = useCurrency();

  /** Stats API + chart series are USD; scale for selected display currency */
  const convertUsdToDisplay = useCallback(
    (usd: number) => {
      const code = getSelectedCurrency?.() ?? "DEFAULT";
      if (code === "DEFAULT") return usd;
      const r = convertToCurrency(usd);
      return typeof r?.convertedValue === "number" ? r.convertedValue : usd;
    },
    [getSelectedCurrency, convertToCurrency]
  );

  /** Format values already in display currency (used for chart series after `convertUsdToDisplay`) */
  const formatInSelectedCurrency = useCallback(
    (n: number, approximate?: boolean) => {
      const selected = getSelectedCurrency?.() ?? "DEFAULT";
      const decimals = approximate
        ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        : { minimumFractionDigits: 0, maximumFractionDigits: 2 };
      const val = typeof n === "number" ? (approximate ? Math.round(n) : n) : 0;
      if (selected === "DEFAULT") {
        const sym = DASHBOARD_CURRENCY_SYMBOL.USD ?? "$";
        return sym + val.toLocaleString(undefined, decimals);
      }
      const sym = DASHBOARD_CURRENCY_SYMBOL[selected] ?? `${selected} `;
      return sym + val.toLocaleString(undefined, decimals);
    },
    [getSelectedCurrency]
  );

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersSearchInput, setUsersSearchInput] = useState("");
  const [usersSearchCommitted, setUsersSearchCommitted] = useState("");
  const [usersSearchLoading, setUsersSearchLoading] = useState(false);
  const [statCardSet, setStatCardSet] = useState<StatCardSet>("revenue");

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  // Sync user filter from URL (e.g. from users page "تحليل تبرعات")
  useEffect(() => {
    const uid = searchParams.get("userId");
    if (uid && uid !== "all") {
      setSelectedUserId(uid);
      fetch(`/api/users/${uid}`)
        .then((r) => r.json())
        .then((data) => {
          const u = data?.user;
          if (u)
            setUsers((prev) => {
              if (prev.some((x) => x.id === u.id)) return prev;
              return [{ id: u.id, name: u.name ?? null, email: u.email ?? "" }, ...prev];
            });
        })
        .catch(() => {});
    }
  }, [searchParams]);

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const displayChartData = useMemo(
    () =>
      chartData.map((d) => ({
        ...d,
        amountUSD: convertUsdToDisplay(d.amountUSD),
        amountOneTime: convertUsdToDisplay(d.amountOneTime),
        amountMonthly: convertUsdToDisplay(d.amountMonthly),
        amountFailed: convertUsdToDisplay(d.amountFailed),
        teamSupport: convertUsdToDisplay(d.teamSupport),
        fees: convertUsdToDisplay(d.fees),
      })),
    [chartData, convertUsdToDisplay]
  );

  const [chartLoading, setChartLoading] = useState(true);
  const [chartView, setChartView] = useState<ChartViewType>("bar");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("month");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("amount");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [donationsSortBy, setDonationsSortBy] = useState<"date" | "amount">("date");
  const [donationsSortOrder, setDonationsSortOrder] = useState<"asc" | "desc">("desc");
  const [showFailed, setShowFailed] = useState(false);
  const [donationsStatusFilter, setDonationsStatusFilter] = useState<"all" | "PAID" | "FAILED" | "PENDING">("all");

  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [donationsPage, setDonationsPage] = useState(1);
  const [donationsTotal, setDonationsTotal] = useState(0);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationsFetchedOnce, setDonationsFetchedOnce] = useState(false);
  const [searchCampaign, setSearchCampaign] = useState("");

  const chartFilterPeriodLabelAr = useMemo(
    () => getDashboardChartPeriodLabelAr(chartPeriod, dateFrom, dateTo),
    [chartPeriod, dateFrom, dateTo]
  );

  // Fetch categories and campaigns
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const lc = locale || "ar";
        const [categoriesRes, campaignsRes] = await Promise.all([
          fetch(`/api/categories?locale=${lc}&counts=true&limit=200`),
          fetch(`/api/campaigns/all?locale=${lc}`),
        ]);
        const categoriesJson = await categoriesRes.json();
        const campaignsJson = await campaignsRes.json();
        setCategories(categoriesJson?.items ?? categoriesJson ?? []);
        setCampaigns(campaignsJson?.items ?? campaignsJson ?? []);
      } catch (error) {
        console.error("Error fetching filters:", error);
      }
    };
    fetchFilters();
  }, [locale]);

  const commitUsersSearch = useCallback(() => {
    setUsersSearchCommitted(usersSearchInput.trim());
  }, [usersSearchInput]);

  // Donor search runs only after Enter / search click (usersSearchCommitted)
  useEffect(() => {
    if (!usersSearchCommitted) return;
    const controller = new AbortController();
    setUsersSearchLoading(true);
    const run = async () => {
      try {
        const res = await fetch(
          `/api/users?search=${encodeURIComponent(usersSearchCommitted)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error(typeof data?.error === "string" ? data.error : "فشل البحث عن المستخدمين");
          setUsers([]);
          return;
        }
        setUsers(data.users ?? []);
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") setUsers([]);
      } finally {
        setUsersSearchLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [usersSearchCommitted]);

  // When not in "search results" mode, keep list small so selected donor still shows a label
  useEffect(() => {
    if (usersSearchCommitted) return;
    if (selectedUserId === "all") {
      setUsers([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/users/${selectedUserId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const u = data?.user;
        if (u)
          setUsers([{ id: u.id, name: u.name ?? null, email: u.email ?? "" }]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [usersSearchCommitted, selectedUserId]);

  // Chart data (filters + period + from/to + user — user from state or URL when coming via link)
  useEffect(() => {
    const userIdFromUrl = searchParams.get("userId");
    const effectiveUserId = selectedUserId !== "all" ? selectedUserId : (userIdFromUrl && userIdFromUrl !== "all" ? userIdFromUrl : "all");
    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("period", chartPeriod);
        if (dateFrom && dateTo) {
          params.set("start", dateFrom);
          params.set("end", dateTo);
        }
        if (selectedCategory !== "all") params.append("categoryId", selectedCategory);
        if (selectedCampaign !== "all") params.append("campaignId", selectedCampaign);
        if (effectiveUserId !== "all") params.append("userId", effectiveUserId);
        if (showFailed) params.set("showFailed", "true");
        const response = await axios.get(`/api/admin/donations/chart?${params}`);
        setChartData(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching chart data:", error);
        toast.error("فشل في تحميل بيانات التبرعات");
        setChartData([]);
      } finally {
        setChartLoading(false);
      }
    };
    fetchChartData();
  }, [selectedCategory, selectedCampaign, selectedUserId, searchParams, chartPeriod, dateFrom, dateTo, showFailed]);

  // Stats — affected by فترة (period + dateFrom/dateTo) and category/campaign filters
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const params = new URLSearchParams();
        params.set("period", chartPeriod);
        if (dateFrom && dateTo) {
          params.set("start", dateFrom);
          params.set("end", dateTo);
        }
        if (selectedCategory !== "all") params.set("categoryId", selectedCategory);
        if (selectedCampaign !== "all") params.set("campaignId", selectedCampaign);
        const response = await fetch(`/api/admin/stats?${params}`);
        const data = await response.json();
        if (!response.ok) {
          const message = data?.details || data?.error || "فشل في تحميل إحصائيات لوحة التحكم";
          toast.error(message);
          return;
        }
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
        toast.error("فشل في تحميل إحصائيات لوحة التحكم");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [chartPeriod, dateFrom, dateTo, selectedCategory, selectedCampaign]);

  // Donations list — uses تصفية النتائج + chart time span (period + from/to) + sort
  const fetchDonations = useCallback(
    async (page: number, append: boolean) => {
      setDonationsLoading(true);
      try {
        const { start, end } = getDonationsDateRange(chartPeriod, dateFrom, dateTo);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        params.set("sortBy", donationsSortBy);
        params.set("sortOrder", donationsSortOrder);
        if (selectedCategory !== "all") params.append("categoryId", selectedCategory);
        if (selectedCampaign !== "all") params.append("campaignId", selectedCampaign);
        if (selectedUserId !== "all") params.append("userId", selectedUserId);
        if (start) params.set("start", start);
        if (end) params.set("end", end);
        if (donationsStatusFilter !== "all") params.set("status", donationsStatusFilter);
        const res = await fetch(`/api/donations?${params}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error || "فشل في تحميل التبرعات");
          return;
        }
        const list = Array.isArray(data.donations) ? data.donations : [];
        setDonations((prev) => (append ? [...prev, ...list] : list));
        setDonationsTotal(data.pagination?.total ?? 0);
      } catch (error) {
        console.error("Error fetching donations:", error);
        toast.error("فشل في تحميل التبرعات");
      } finally {
        setDonationsLoading(false);
        setDonationsFetchedOnce(true);
      }
    },
    [
      selectedCategory,
      selectedCampaign,
      selectedUserId,
      chartPeriod,
      dateFrom,
      dateTo,
      donationsSortBy,
      donationsSortOrder,
      donationsStatusFilter,
    ]
  );

  // Fetch donations when filters or time span or sort change
  useEffect(() => {
    if (loading) return;
    setDonationsPage(1);
    fetchDonations(1, false);
  }, [loading, selectedCategory, selectedCampaign, selectedUserId, chartPeriod, dateFrom, dateTo, donationsSortBy, donationsSortOrder, donationsStatusFilter, fetchDonations]);

  const loadMoreDonations = () => {
    const next = donationsPage + 1;
    setDonationsPage(next);
    fetchDonations(next, true);
  };

  const hasMoreDonations =
    donations.length < donationsTotal && !donationsLoading;

  if (loading) {
    return <LoadingSkeleton />;
  }

  const formatMoney = (n: number, sourceCurrency?: string, amountUSD?: number, approximate?: boolean) => {
    const decimals = approximate ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : { minimumFractionDigits: 0, maximumFractionDigits: 2 };
    const selected = getSelectedCurrency?.() ?? "DEFAULT";
    if (selected === "DEFAULT" && sourceCurrency) {
      const sym = DASHBOARD_CURRENCY_SYMBOL[sourceCurrency] ?? sourceCurrency + " ";
      const val = typeof n === "number" ? (approximate ? Math.round(n) : n) : 0;
      return sym + val.toLocaleString(undefined, decimals);
    }
    if (sourceCurrency && sourceCurrency === selected) {
      const sym = DASHBOARD_CURRENCY_SYMBOL[sourceCurrency] ?? sourceCurrency + " ";
      const val = typeof n === "number" ? (approximate ? Math.round(n) : n) : 0;
      return sym + val.toLocaleString(undefined, decimals);
    }
    const valueToConvert = amountUSD != null ? amountUSD : n;
    const r = convertToCurrency(valueToConvert);
    if (r?.convertedValue != null && r?.currency) {
      const sym = DASHBOARD_CURRENCY_SYMBOL[r.currency] ?? r.currency + " ";
      const val = typeof r.convertedValue === "number" ? (approximate ? Math.round(r.convertedValue) : r.convertedValue) : 0;
      return sym + val.toLocaleString(undefined, decimals);
    }
    const val = typeof n === "number" ? (approximate ? Math.round(n) : n) : 0;
    return "$" + val.toLocaleString(undefined, decimals);
  };

  const oneTimeTotal = stats?.oneTimeTotalAmount ?? 0;
  const monthlyTotal = stats?.monthlyTotalAmount ?? 0;
  const revenueSplitData = [
    {
      name: "حملات",
      value: stats?.campaignDonationsTotal ?? 0,
      count: stats?.campaignDonationsCount ?? 0,
      color: "#2563eb",
    },
    {
      name: "فئات",
      value: stats?.categoryDonationsTotal ?? 0,
      count: stats?.categoryDonationsCount ?? 0,
      color: "#64748b",
    },
  ].filter((d) => d.value > 0 || d.count > 0);

  const typeSplitData = [
    {
      name: "مرة واحدة",
      value: oneTimeTotal,
      count: stats?.oneTimeCount ?? 0,
      color: "#3b82f6",
    },
    {
      name: "شهرية",
      value: monthlyTotal,
      count: stats?.monthlyCount ?? 0,
      color: "#1d4ed8",
    },
  ].filter((d) => d.value > 0 || d.count > 0);

  const paidFailedSplitData = [
    {
      name: "مدفوعة",
      value: stats?.totalAmount ?? 0,
      count: stats?.paidCount ?? 0,
      color: "#22c55e",
    },
    {
      name: "فاشلة",
      value: stats?.failedTotalAmount ?? 0,
      count: stats?.failedCount ?? 0,
      color: "#ef4444",
    },
    {
      name: "معلقة",
      value: stats?.pendingTotalAmount ?? 0,
      count: stats?.pendingCount ?? 0,
      color: "#f59e0b",
    },
  ].filter((d) => d.value > 0 || d.count > 0);

  return (
    <div className="min-h-0" dir="rtl">
      <div className="space-y-6 sm:space-y-8 p-0 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-right min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              تحليل الإيرادات
            </h1>
            <p className="text-muted-foreground mt-1 text-sm break-words">
              {searchParams.get("userId") ? (
                <>
                  عرض تبرعات:{" "}
                  <span className="font-medium text-foreground whitespace-normal break-words">
                    {users.find((u) => u.id === searchParams.get("userId"))?.name ||
                      users.find((u) => u.id === searchParams.get("userId"))?.email ||
                      "جاري التحميل..."}
                  </span>
                </>
              ) : (
                "نظرة شاملة على الإيرادات، التبرعات والتحليلات"
              )}
            </p>
          </div>
        </header>

        {/* المؤشرات — تختفي عند عرض تبرعات مستخدم معين عبر الرابط */}
        {!searchParams.get("userId") && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 flex-row-reverse">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              المؤشرات (حسب الفترة والتصفية)
            </h2>
            <Tabs
              value={statCardSet}
              onValueChange={(v) => setStatCardSet(v as StatCardSet)}
              className="w-auto"
            >
              <TabsList className="bg-muted p-1 rounded-lg h-9" dir="rtl">
                <TabsTrigger
                  value="revenue"
                  className="text-xs px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  الإيرادات
                </TabsTrigger>
                <TabsTrigger
                  value="overview"
                  className="text-xs px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  نظرة عامة
                </TabsTrigger>
                <TabsTrigger
                  value="breakdown"
                  className="text-xs px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  تفصيل التبرعات
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {statCardSet === "revenue" && (
              <>
                <StatsMetricCard
                  compact
                  title={`إيرادات ناجحة (${chartFilterPeriodLabelAr})`}
                  value={stats?.totalAmount ?? 0}
                  icon={DollarSign}
                  accent="emerald"
                  format="money"
                  variant="hero"
                  subtitle="مجموع التبرعات المدفوعة فقط — حسب الفترة والتصفية أعلاه"
                />
                <StatsMetricCard
                  compact
                  title="إيرادات ناجحة (كل الوقت)"
                  value={stats?.paidRevenueAllTimeUnfiltered ?? 0}
                  icon={DollarSign}
                  accent="emerald"
                  format="money"
                  subtitle="جميع التبرعات الناجحة بشكل عام دول فلتر"
                />
                <StatsMetricCard
                  compact
                  title={thisMonthRevenueTitle}
                  value={stats?.thisMonthRevenue ?? 0}
                  icon={Calendar}
                  accent="emerald"
                  format="money"
                  subtitle="دفعات ناجحة في الشهر الحالي (UTC)"
                />
                <StatsMetricCard
                  compact
                  title="إيرادات شهرية متكررة (MRR)"
                  value={stats?.monthlyRecurringRevenue ?? 0}
                  icon={Repeat}
                  accent="emerald"
                  format="money"
                  subtitle="اشتراكات نشطة — مبالغ مخططة"
                />
                <StatsMetricCard
                  compact
                  title="دعم الفريق"
                  value={stats?.teamSupportTotal ?? 0}
                  icon={HandCoins}
                  accent="amber"
                  format="money"
                  subtitle={`من التبرعات الناجحة (${chartFilterPeriodLabelAr})`}
                />
                <StatsMetricCard
                  compact
                  title="الرسوم"
                  value={stats?.feesTotal ?? 0}
                  icon={Percent}
                  accent="orange"
                  format="money"
                  subtitle={`من التبرعات الناجحة (${chartFilterPeriodLabelAr})`}
                />
                <StatsMetricCard
                  compact
                  title="تبرعات ناجحة"
                  value={stats?.paidCount ?? 0}
                  icon={Receipt}
                  accent="teal"
                  subtitle={`إجمالي مبالغ ناجحة: ${formatMoney(stats?.totalAmount ?? 0, undefined, undefined, true)}`}
                />
                <StatsMetricCard
                  compact
                  title="تبرعات فاشلة"
                  value={stats?.failedCount ?? 0}
                  icon={Receipt}
                  accent="orange"
                  subtitle={stats?.failedTotalAmount ? formatMoney(stats.failedTotalAmount, undefined, undefined, true) : "—"}
                />
                <StatsMetricCard
                  compact
                  title="تبرعات معلقة"
                  value={stats?.pendingCount ?? 0}
                  icon={Receipt}
                  accent="amber"
                  subtitle={
                    stats?.pendingTotalAmount
                      ? formatMoney(stats.pendingTotalAmount, undefined, undefined, true)
                      : undefined
                  }
                />
              </>
            )}
            {statCardSet === "overview" && (
              <>
                <StatsMetricCard
                  compact
                  title="الحملات"
                  value={stats?.totalCampaigns ?? 0}
                  icon={Heart}
                  accent="teal"
                />
                <StatsMetricCard
                  compact
                  title="الفئات"
                  value={stats?.totalCategories ?? 0}
                  icon={FolderTree}
                  accent="indigo"
                />
                <StatsMetricCard
                  compact
                  title="المستخدمين"
                  value={stats?.totalUsers ?? 0}
                  icon={Users}
                  accent="amber"
                />
                <StatsMetricCard
                  compact
                  title="عدد التبرعات"
                  value={stats?.totalDonations ?? 0}
                  icon={Receipt}
                  accent="violet"
                />
              </>
            )}
            {statCardSet === "breakdown" && (
              <>
                <StatsMetricCard
                  compact
                  title="مرة واحدة (عدد)"
                  value={stats?.oneTimeCount ?? 0}
                  icon={Receipt}
                  accent="slate"
                />
                <StatsMetricCard
                  compact
                  title="شهرية (عدد)"
                  value={stats?.monthlyCount ?? 0}
                  icon={Repeat}
                  accent="slate"
                />
                <StatsMetricCard
                  compact
                  title="التبرعات الشهرية الناشطة"
                  value={stats?.activeMonthlyAmountUSD ?? 0}
                  icon={Repeat}
                  accent="teal"
                  format="money"
                  subtitle={`عدد: ${stats?.activeMonthlyCount ?? 0}`}
                />
                <StatsMetricCard
                  compact
                  title="التبرعات الشهرية المتوقفة"
                  value={stats?.monthlyStoppedAmountUSD ?? 0}
                  icon={Repeat}
                  accent="indigo"
                  format="money"
                  subtitle={`عدد: ${stats?.monthlyStoppedCount ?? 0}`}
                />
                <StatsMetricCard
                  compact
                  title="تبرعات مقبولة"
                  value={stats?.paidCount ?? 0}
                  icon={Receipt}
                  accent="teal"
                  subtitle={`${formatMoney(stats?.totalAmount ?? 0, undefined, stats?.totalAmount)}`}
                />
              </>
            )}
          </div>
        </section>
        )}

        {/* تصفية النتائج — تؤثر على الرسم وجدول التبرعات (فترة، فئة، حملة، مستخدم، نوع الرسم) */}
        <Card className="border-border shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 justify-end">
              <Search className="w-4 h-4 shrink-0" />
              <span>تصفية النتائج</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4" dir="rtl">

<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

    {/* Period — مع من/إلى/مسح تحته عند مخصص */}
    <div className="space-y-2 text-right">
      <label className="text-[11px] font-medium text-slate-500">
        الفترة
      </label>
      <Select
        value={chartPeriod === "custom" || (dateFrom && dateTo) ? "custom" : chartPeriod}
        onValueChange={(v) => {
          const p = v as ChartPeriod;
          setChartPeriod(p);
          if (p === "custom") {
            const end = new Date();
            const start = new Date(end);
            start.setDate(start.getDate() - 30);
            setDateTo(end.toISOString().slice(0, 10));
            setDateFrom(start.toISOString().slice(0, 10));
          } else {
            setDateFrom("");
            setDateTo("");
          }
        }}
      >
        <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm">
          <SelectValue placeholder="اختر الفترة" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PERIOD_LABELS) as ChartPeriod[]).map((p) => (
            <SelectItem key={p} value={p} className="text-xs">
              {PERIOD_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {chartPeriod === "custom" && (
        <div className="flex gap-2 pt-1 border-slate-100">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">من</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full min-w-[120px] h-9 px-3 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:border-[#025EB8] focus:outline-none focus:ring-1 focus:ring-[#025EB8]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">إلى</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full min-w-[120px] h-9 px-3 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:border-[#025EB8] focus:outline-none focus:ring-1 focus:ring-[#025EB8]"
            />
          </div>
        </div>
      )}
    </div>

  {/* Category */}
  <div className="space-y-1 text-right">
    <label className="text-[11px] font-medium text-slate-500">
      الفئة
    </label>
    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
      <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm">
        <SelectValue placeholder="اختر الفئة" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">جميع الفئات</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id} className="text-xs">
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Campaign */}
  <div className="space-y-1 text-right">
    <label className="text-[11px] font-medium text-slate-500">
      الحملة
    </label>
    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
      <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm">
        <SelectValue placeholder="اختر الحملة" />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2 border-b border-slate-100">
          <Input
            placeholder="بحث..."
            value={searchCampaign}
            onChange={(e) => setSearchCampaign(e.target.value)}
            className="w-full h-8 text-xs"
          />
        </div>
        <SelectItem value="all" className="text-xs">جميع الحملات</SelectItem>
        {campaigns
          .filter(
            (c) =>
              (selectedCategory === "all" || c.categoryId === selectedCategory) &&
              (!searchCampaign ||
                c.title.toLowerCase().includes(searchCampaign.toLowerCase()))
          )
          .map((c) => (
            <SelectItem key={c.id} value={c.id} className="text-xs">
              {c.title}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </div>

  {/* User — hidden when viewing a specific user via link (?userId=...) */}
  {!searchParams.get("userId") && (
    <div className="space-y-1 text-right">
      <label className="text-[11px] font-medium text-slate-500">
        المستخدم
      </label>
      <Select
        value={selectedUserId}
        onValueChange={(v) => {
          setSelectedUserId(v);
          if (v === "all") {
            setUsersSearchInput("");
            setUsersSearchCommitted("");
            setUsers([]);
          }
        }}
      >
        <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm">
          <SelectValue placeholder="اختر المستخدم" />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b border-slate-100 flex gap-1.5 flex-row-reverse items-center">
            <Input
              placeholder="بحث… ثم Enter أو زر البحث"
              value={usersSearchInput}
              onChange={(e) => setUsersSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitUsersSearch();
                }
              }}
              className="w-full h-8 text-xs flex-1 min-w-0"
            />
            <button
              type="button"
              title="بحث"
              disabled={usersSearchLoading}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                commitUsersSearch();
              }}
              className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50"
            >
              {usersSearchLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
              ) : (
                <Search className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>
          </div>
          <SelectItem value="all" className="text-xs">الكل</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id} className="text-xs">
              {u.name || u.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )}

  {/* Chart Metric */}
  <div className="space-y-1 text-right">
    <label className="text-[11px] font-medium text-slate-500">
      القيمة
    </label>
    <Select value={chartMetric} onValueChange={(v) => setChartMetric(v as ChartMetric)}>
      <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm">
        <SelectValue placeholder="اختر القيمة" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="amount" className="text-xs">المبلغ</SelectItem>
        <SelectItem value="teamSupport" className="text-xs">دعم الفريق</SelectItem>
        <SelectItem value="fees" className="text-xs">الرسوم</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Chart Type */}
  <div className="space-y-1 text-right">
    <label className="text-[11px] font-medium text-slate-500">
      نوع الرسم
    </label>
    <Select value={chartView} onValueChange={(v) => setChartView(v as ChartViewType)}>
      <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm">
        <SelectValue placeholder="اختر النوع" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="bar" className="text-xs">أعمدة</SelectItem>
        <SelectItem value="line" className="text-xs">خط</SelectItem>
        <SelectItem value="area" className="text-xs">منطقة</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Donation Status Filter */}
  <div className="space-y-1 text-right">
    <label className="text-[11px] font-medium text-slate-500">
      حالة التبرع
    </label>
    <Select value={donationsStatusFilter} onValueChange={(v) => setDonationsStatusFilter(v as typeof donationsStatusFilter)}>
      <SelectTrigger className="w-full h-9 px-3 text-xs rounded-lg border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm">
        <SelectValue placeholder="الحالة" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">كل الحالات</SelectItem>
        <SelectItem value="PAID" className="text-xs">ناجح</SelectItem>
        <SelectItem value="FAILED" className="text-xs">فاشل</SelectItem>
        <SelectItem value="PENDING" className="text-xs">معلق</SelectItem>
      </SelectContent>
    </Select>
  </div>

</div>

</CardContent>



        </Card>

        {/* التحليلات */}
        <section className="space-y-4">
          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <Tabs defaultValue="time-series" className="w-full" dir="rtl">


                <TabsContent value="time-series" className="mt-0" dir="rtl">
                  <div className="h-[400px] w-full">
                    {chartLoading ? (
                      <div className="h-full flex items-center justify-center bg-slate-50 rounded-lg">
                        <Loader2 className="w-9 h-9 animate-spin text-[#025EB8]" />
                      </div>
                    ) : chartView === "bar" ? (
                      chartMetric === "amount" ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={displayChartData}
                            barCategoryGap="16%"
                            barGap={6}
                            margin={{ top: 10, right: 24, left: 10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                              tickFormatter={(v) =>
                                new Date(v).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                })
                              }
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                              tickFormatter={(v) => formatInSelectedCurrency(Number(v))}
                              domain={[0, "auto"]}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                              }}
                              labelFormatter={(v) =>
                                new Date(v).toLocaleDateString("en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              }
                              formatter={(value: number, name: string) => {
                                if (name === "amountOneTime") return [formatInSelectedCurrency(Number(value), true), "مبلغ مرة واحدة"];
                                if (name === "amountMonthly") return [formatInSelectedCurrency(Number(value), true), "مبلغ شهري"];
                                if (name === "amountFailed") return [formatInSelectedCurrency(Number(value), true), "مبلغ فاشل"];
                                return [formatInSelectedCurrency(Number(value), true), name];
                              }}
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const point = displayChartData.find((d) => d.date === label);
                                const isAmount = (key: string) => key === "amountOneTime" || key === "amountMonthly" || key === "amountFailed" || key === "مبلغ مرة واحدة" || key === "مبلغ شهري" || key === "مبلغ فاشل";
                                return (
                                  <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
                                    <p className="text-sm font-medium text-slate-700 mb-1.5">
                                      {label ? new Date(label).toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : ""}
                                    </p>
                                    {payload.map((entry) => {
                                      const dataKey = (entry as { dataKey?: string }).dataKey ?? entry.name;
                                      const showAsMoney = isAmount(String(dataKey)) || isAmount(String(entry.name));
                                      return (
                                        <p key={String(entry.name)} className="text-sm text-slate-600" style={{ color: entry.color }}>
                                          {entry.name}: {showAsMoney ? formatInSelectedCurrency(Number(entry.value), true) : String(entry.value)}
                                        </p>
                                      );
                                    })}
                                    {point != null && (
                                      <>
                                        <p className="text-sm font-medium text-slate-700 mt-1.5 pt-1 border-t border-slate-100">
                                          الإجمالي: {formatInSelectedCurrency(Number(point.amountUSD ?? 0), true)}
                                        </p>
                                        <p className="text-sm text-slate-500 mt-0.5">
                                          عدد التبرعات: {Math.round(Number(point.count))}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                );
                              }}
                            />
                            <Legend />
                            <Bar
                              dataKey="amountOneTime"
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={32}
                              name="مبلغ مرة واحدة"
                            />
                            <Bar
                              dataKey="amountMonthly"
                              fill="#1d4ed8"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={32}
                              name="مبلغ شهري"
                            />
                            {showFailed && (
                              <Bar
                                dataKey="amountFailed"
                                fill="#ef4444"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={32}
                                name="مبلغ فاشل"
                              />
                            )}
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={displayChartData}
                            barCategoryGap="20%"
                            barGap={8}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                              tickFormatter={(v) =>
                                new Date(v).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                })
                              }
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              yAxisId="amount"
                              orientation="left"
                              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                              tickFormatter={(v) => formatInSelectedCurrency(Number(v))}
                              domain={[0, "auto"]}
                            />
                            <YAxis
                              yAxisId="count"
                              orientation="right"
                              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                              tickFormatter={(v) => String(Math.round(Number(v)))}
                              domain={[0, "auto"]}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                              }}
                              labelFormatter={(v) =>
                                new Date(v).toLocaleDateString("en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              }
                              formatter={(value: number, name: string) => {
                                if (name === "count" || name === "عدد التبرعات") return [String(Math.round(Number(value))), "عدد التبرعات"];
                                if (chartMetric === "teamSupport") return [formatInSelectedCurrency(Number(value), true), "دعم الفريق"];
                                if (chartMetric === "fees") return [formatInSelectedCurrency(Number(value), true), "الرسوم"];
                                return [String(Math.round(Number(value))), "العدد"];
                              }}
                            />
                            <Legend />
                            <Bar
                              yAxisId="amount"
                              dataKey={chartMetric}
                              fill={chartMetric === "teamSupport" ? "#f59e0b" : "#ea580c"}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={36}
                              name={chartMetric === "teamSupport" ? "دعم الفريق" : "الرسوم"}
                            />
                            <Line
                              yAxisId="count"
                              type="monotone"
                              dataKey="count"
                              stroke="#0f766e"
                              strokeWidth={2}
                              dot={false}
                              name="عدد التبرعات"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      )
                    ) : chartView === "line" ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={displayChartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={CHART_COLORS.grid}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                            tickFormatter={(v) =>
                              new Date(v).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                              })
                            }
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            yAxisId="amount"
                            orientation="right"
                            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                            tickFormatter={(v) => formatInSelectedCurrency(Number(v))}
                          />
                          <YAxis
                            yAxisId="count"
                            orientation="left"
                            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                            tickFormatter={(v) => String(Math.round(Number(v)))}
                            domain={[0, "auto"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                            labelFormatter={(v) =>
                              new Date(v).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            }
                            formatter={(value: number, name: string) => {
                              if (name === "count" || name === "عدد التبرعات") return [String(Math.round(Number(value))), "عدد التبرعات"];
                              if (chartMetric === "amount") return [formatInSelectedCurrency(Number(value), true), "المبلغ"];
                              if (chartMetric === "teamSupport") return [formatInSelectedCurrency(Number(value), true), "دعم الفريق"];
                              if (chartMetric === "fees") return [formatInSelectedCurrency(Number(value), true), "الرسوم"];
                              return [String(Math.round(Number(value))), "العدد"];
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="amount"
                            type="monotone"
                            dataKey={chartMetric === "amount" ? "amountUSD" : chartMetric}
                            stroke={
                              chartMetric === "amount"
                                ? "#2563eb"
                                : chartMetric === "teamSupport"
                                  ? "#f59e0b"
                                  : "#ea580c"
                            }
                            strokeWidth={2}
                            dot={false}
                            name={
                              chartMetric === "amount"
                                ? "المبلغ"
                                : chartMetric === "teamSupport"
                                  ? "دعم الفريق"
                                  : "الرسوم"
                            }
                          />
                          <Line
                            yAxisId="count"
                            type="monotone"
                            dataKey="count"
                            stroke="#0f766e"
                            strokeWidth={2}
                            dot={false}
                            name="عدد التبرعات"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={displayChartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={CHART_COLORS.grid}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                            tickFormatter={(v) =>
                              new Date(v).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                              })
                            }
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            yAxisId="amount"
                            orientation="right"
                            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                            tickFormatter={(v) => formatInSelectedCurrency(Number(v))}
                          />
                          <YAxis
                            yAxisId="count"
                            orientation="left"
                            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                            tickFormatter={(v) => String(Math.round(Number(v)))}
                            domain={[0, "auto"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                            labelFormatter={(v) =>
                              new Date(v).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            }
                            formatter={(value: number, name: string) => {
                              if (name === "count" || name === "عدد التبرعات") return [String(Math.round(Number(value))), "عدد التبرعات"];
                              if (chartMetric === "amount") return [formatInSelectedCurrency(Number(value), true), "المبلغ"];
                              if (chartMetric === "teamSupport") return [formatInSelectedCurrency(Number(value), true), "دعم الفريق"];
                              if (chartMetric === "fees") return [formatInSelectedCurrency(Number(value), true), "الرسوم"];
                              return [String(Math.round(Number(value))), "العدد"];
                            }}
                          />
                          <Legend />
                          <Area
                            yAxisId="amount"
                            type="monotone"
                            dataKey={chartMetric === "amount" ? "amountUSD" : chartMetric}
                            stroke={
                              chartMetric === "amount"
                                ? "#2563eb"
                                : chartMetric === "teamSupport"
                                  ? "#f59e0b"
                                  : "#ea580c"
                            }
                            fill={
                              chartMetric === "amount"
                                ? "#93c5fd"
                                : chartMetric === "teamSupport"
                                  ? "#fcd34d"
                                  : "#fdba74"
                            }
                            fillOpacity={0.4}
                            strokeWidth={2}
                            name={
                              chartMetric === "amount"
                                ? "المبلغ"
                                : chartMetric === "teamSupport"
                                  ? "دعم الفريق"
                                  : "الرسوم"
                            }
                          />
                          <Line
                            yAxisId="count"
                            type="monotone"
                            dataKey="count"
                            stroke="#0f766e"
                            strokeWidth={2}
                            dot={false}
                            name="عدد التبرعات"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="split" className="mt-0" dir="rtl">
                  <Tabs defaultValue="paid-failed" className="w-full" dir="rtl">
                    <TabsList className="bg-slate-100 p-1 rounded-lg mb-4 inline-flex flex-row-reverse">
                      <TabsTrigger
                        value="campaign-category"
                        className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm"
                      >
                        حملات vs فئات
                      </TabsTrigger>
                      <TabsTrigger
                        value="one-time-monthly"
                        className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm"
                      >
                        مرة واحدة vs شهرية
                      </TabsTrigger>
                      <TabsTrigger
                        value="paid-failed"
                        className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm"
                      >
                        مقبول vs فاشل
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="campaign-category" className="mt-0">
                      <div className="h-[340px] w-full flex items-center justify-center">
                        {revenueSplitData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={revenueSplitData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) =>
                                  `${name} ${(percent * 100).toFixed(0)}%`
                                }
                              >
                                {revenueSplitData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number, _name: string, props: { payload?: { count?: number } }) => {
                                  const count = props?.payload?.count ?? 0;
                                  return [
                                    `${formatMoney(Number(value), undefined, undefined, true)} — عدد: ${count}`,
                                    "المبلغ / العدد",
                                  ];
                                }}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-slate-500">لا توجد بيانات</p>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="one-time-monthly" className="mt-0" dir="rtl">
                      <div className="h-[340px] w-full flex items-center justify-center">
                        {typeSplitData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={typeSplitData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) =>
                                  `${name} ${(percent * 100).toFixed(0)}%`
                                }
                              >
                                {typeSplitData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number, _name: string, props: { payload?: { count?: number } }) => {
                                  const count = props?.payload?.count ?? 0;
                                  return [
                                    `${formatMoney(Number(value), undefined, undefined, true)} — عدد: ${count}`,
                                    "المبلغ / العدد",
                                  ];
                                }}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-slate-500">لا توجد بيانات</p>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="paid-failed" className="mt-0" dir="rtl">
                      <div className="h-[340px] w-full flex items-center justify-center">
                        {paidFailedSplitData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={paidFailedSplitData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="count"
                                nameKey="name"
                                label={({ name, percent }) =>
                                  `${name} ${(percent * 100).toFixed(0)}%`
                                }
                              >
                                {paidFailedSplitData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number, _name: string, props: { payload?: { value?: number; count?: number } }) => {
                                  const amount = props?.payload?.value ?? 0;
                                  return [
                                    `عدد: ${value}${amount > 0 ? ` — ${formatMoney(Number(amount), undefined, undefined, true)}` : ""}`,
                                    "التبرعات",
                                  ];
                                }}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-slate-500">لا توجد بيانات</p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
                <div className="flex items-center gap-4 mt-6 flex-row-reverse flex-wrap">
                  <TabsList className="bg-slate-100 p-1 rounded-lg flex-row-reverse max-w-max">
                    <TabsTrigger
                      value="split"
                      className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"
                    >
                      <PieChartIcon className="w-4 h-4" />
                      توزيع الإيرادات
                    </TabsTrigger>
                    <TabsTrigger
                      value="time-series"
                      className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      التبرعات عبر الزمن
                    </TabsTrigger>
                  </TabsList>
                  {chartView === "bar" && chartMetric === "amount" && (
                    <button
                      type="button"
                      onClick={() => setShowFailed((p) => !p)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        showFailed
                          ? "bg-red-50 border-red-200 text-red-600"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: showFailed ? "#ef4444" : "#94a3b8" }} />
                      {showFailed ? "إخفاء الفاشلة" : "إظهار الفاشلة"}
                    </button>
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* التبرعات */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
            التبرعات
          </h2>
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-slate-100 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-row-reverse">
                <div className="text-right space-y-1">
                  <CardTitle className="text-base font-semibold text-slate-900">
                    أحدث التبرعات
                  </CardTitle>
                  <p className="text-[11px] text-slate-500 max-w-xl">
                    يعرض الجدول كل المحاولات حسب «حالة التبرع» في تصفية النتائج أعلاه (الكل / ناجح / فاشل / معلق)، مع الفترة والفئة والحملة.
                  </p>
                </div>
                <Select
                  value={`${donationsSortBy}-${donationsSortOrder}`}
                  onValueChange={(v) => {
                    const [by, order] = v.split("-") as ["date" | "amount", "asc" | "desc"];
                    setDonationsSortBy(by);
                    setDonationsSortOrder(order);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[200px] h-9 border-slate-200 bg-slate-50/50" dir="rtl">
                    <SelectValue placeholder="ترتيب" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="date-desc">الأحدث أولاً</SelectItem>
                    <SelectItem value="date-asc">الأقدم أولاً</SelectItem>
                    <SelectItem value="amount-desc">الأعلى مبلغاً</SelectItem>
                    <SelectItem value="amount-asc">الأقل مبلغاً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto" dir="rtl">
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        المتبرع
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        التبرع
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        الحالة
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        البوابة
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        دعم الفريق
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        مشاركة الرسوم
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        النوع
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        الإحالة
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        الحملة / الفئة
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-700">
                        التاريخ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {donationsLoading && donations.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                        </td>
                      </tr>
                    ) : !donationsFetchedOnce ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500">
                          جاري التحميل...
                        </td>
                      </tr>
                    ) : donations.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500">
                          لا توجد تبرعات تطابق التصفية
                        </td>
                      </tr>
                    ) : (
                      donations.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">
                              {d.donor?.name || "—"}
                            </p>
                            {d.donor?.email && (
                              <p className="text-xs text-slate-500 truncate max-w-[180px]">
                                {d.donor.email}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800" dir="rtl">
                            <span dir="ltr">
                              {formatMoney((d.amount ?? d.totalAmount ?? 0) as number, d.currency, d.amountUSD)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                                d.status === "PAID"
                                  ? "bg-green-100 text-green-700"
                                  : d.status === "FAILED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              )}
                            >
                              {d.status === "PAID" ? "ناجح" : d.status === "FAILED" ? "فاشل" : "معلق"}
                            </span>
                            {d.status === "FAILED" && d.providerErrorMessage && (
                              <p className="text-[10px] text-red-500 mt-0.5 max-w-[140px] leading-tight" title={d.providerErrorMessage}>
                                {d.providerErrorMessage.length > 50 ? d.providerErrorMessage.slice(0, 50) + "…" : d.providerErrorMessage}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {d.provider === "STRIPE" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-[#635bff]/10 text-[#635bff]">
                                Stripe
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>
                              </span>
                            ) : d.provider === "PAYFOR" ? (
                              <span className="inline-flex items-center">
                                <img
                                  src="/ziraat.jpg"
                                  alt="PayFor"
                                  className="h-14 w-auto max-w-[120px] object-contain rounded"
                                />
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800" dir="rtl">
                            {(d.teamSupport ?? 0) > 0 ? (
                              <span dir="ltr">
                                {formatMoney(d.teamSupport ?? 0, d.currency, (d.totalAmount && (d.amountUSD != null)) ? ((d.teamSupport ?? 0) / d.totalAmount) * d.amountUSD : undefined)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800" dir="rtl">
                            {(d.fees ?? 0) > 0 ? (
                              <span dir="ltr">
                                {formatMoney(d.fees ?? 0, d.currency, (d.totalAmount && (d.amountUSD != null)) ? ((d.fees ?? 0) / d.totalAmount) * d.amountUSD : undefined)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "inline-block w-max px-2 py-0.5 rounded-full text-[12px]",
                                d.type === "MONTHLY"
                                  ? "bg-[#025EB8]/10 text-[#025EB8]"
                                  : "bg-gray-100 text-gray-600"
                              )}
                            >
                              {d.type === "MONTHLY" ? "شهري" : "مرة واحدة"}
                            </span>
                          </td>
                          <td className="py-3 px-4 align-top">
                            {d.referral ? (
                              <Link
                                href={`/dashboard/referrals/${d.referral.id}`}
                                className="text-sm font-medium text-[#025EB8] hover:text-[#025EB8] hover:underline"
                              >
                                {d.referral.code}
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-[240px]">
                            {d.campaigns?.length > 0 ? (
                              <span>
                                {d.campaigns.map((c) => c.title).join(", ")}
                              </span>
                            ) : d.categories?.length > 0 ? (
                              <span>
                                فئة: {d.categories.map((c) => c.name).join(", ")}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(d.createdAt).toLocaleDateString("en-US", {
                              dateStyle: "medium",
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {hasMoreDonations && (
                <div className="p-4 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={loadMoreDonations}
                    disabled={donationsLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium disabled:opacity-50"
                  >
                    {donationsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4 rotate-180" />
                    )}
                    عرض المزيد
                  </button>
                </div>
              )}
              {donationsTotal > 0 && (
                <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100 text-right">
                  عرض {donations.length} من {donationsTotal} تبرع
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto" dir="rtl">
      <div className="h-16 rounded-lg bg-slate-200 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-200 animate-pulse" />
        ))}
      </div>
      <div className="h-[480px] rounded-lg bg-slate-200 animate-pulse" />
      <div className="h-64 rounded-lg bg-slate-200 animate-pulse" />
    </div>
  );
}
