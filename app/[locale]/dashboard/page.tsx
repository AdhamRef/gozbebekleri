"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Book,
  FileText,
  GraduationCap,
  FolderKanban,
  TrendingUp,
  Users,
  DollarSign,
  Heart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  BarChart,
  Bar,
  ComposedChart,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CountUp from "react-countup";
import axios from "axios";
import { toast } from "react-hot-toast";

// Type definitions
interface AnalyticsData {
  name: string;
  [key: string]: number | string;
}

interface StatCard {
  title: string;
  value: string;
  icon: React.ElementType;
  change: string;
}

interface ActivityItem {
  icon: React.ElementType;
  title: string;
  time: string;
}

interface DashboardStats {
  totalCampaigns: number;
  totalDonations: number;
  totalUsers: number;
  totalAmount: number;
  recentCampaigns: Array<{
    id: string;
    title: string;
    currentAmount: number;
    targetAmount: number;
    createdAt: string;
  }>;
  recentDonations: Array<{
    id: string;
    amount: number;
    currency: number;
    campaignTitle: string;
    donorName: string;
    createdAt: string;
  }>;
}

// Period mapping for API
const PERIOD_MAP = {
  "هذا الأسبوع": "this-week",
  "هذا الشهر": "this-month",
  "هذا العام": "this-year",
};

// Add these interfaces
interface ChartData {
  date: string;
  amount: number;
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [searchCategory, setSearchCategory] = useState("");
  const [searchCampaign, setSearchCampaign] = useState("");

  // Refs to manage focus
  const categoryInputRef = useRef<HTMLInputElement | null>(null);
  const campaignInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch categories and campaigns
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoriesRes, campaignsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/campaigns/all"),
        ]);
        const categoriesData = await categoriesRes.json();
        const campaignsData = await campaignsRes.json();

        setCategories(categoriesData);
        setCampaigns(campaignsData);
      } catch (error) {
        console.error("Error fetching filters:", error);
      }
    };
    fetchFilters();
  }, []);

  // Fetch donation chart data when selection changes
  useEffect(() => {
    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== "all") {
          params.append("categoryId", selectedCategory);
        }
        if (selectedCampaign !== "all") {
          params.append("campaignId", selectedCampaign);
        }

        const response = await axios.get(`/api/admin/donations/chart?${params}`);
        setChartData(response.data);
        console.log(response.data);
      } catch (error) {
        console.error("Error fetching chart data:", error);
        toast.error("فشل في تحميل بيانات التبرعات");
      } finally {
        setChartLoading(false);
      }
    };

    fetchChartData();
  }, [selectedCategory, selectedCampaign]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          لوحة التحكم
        </h1>
        <p className="text-gray-600">
          هنا يمكنك إدارة الحملات والتبرعات والمستخدمين
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="إجمالي الحملات"
          value={stats?.totalCampaigns || 0}
          icon={<Heart className="w-5 h-5" />}
          trend={12}
          color="emerald"
        />
        <StatsCard
          title="إجمالي التبرعات"
          value={stats?.totalDonations || 0}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={8}
          color="blue"
        />
        <StatsCard
          title="المستخدمين"
          value={stats?.totalUsers || 0}
          icon={<Users className="w-5 h-5" />}
          trend={-5}
          color="purple"
        />
        <StatsCard
          title="إجمالي المبالغ"
          value={stats?.totalAmount || 0}
          icon={<DollarSign className="w-5 h-5" />}
          trend={15}
          color="amber"
          prefix="$"
        />
      </div>

      {/* Filters and Chart Section */}
      <Card className="p-6">
        <div className="flex flex-col space-y-4 mb-6">
          <h2 className="text-lg font-semibold">تحليل التبرعات</h2>
          <div className="flex gap-4">
            <div className="w-64">
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <input
                    ref={categoryInputRef}
                    type="text"
                    placeholder="ابحث عن الفئة"
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    onFocus={() => categoryInputRef.current?.focus()}
                    className="border border-gray-300 rounded-lg p-2 mb-2 w-full"
                  />
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories
                    .filter((category) =>
                      category.name.toLowerCase().includes(searchCategory.toLowerCase())
                    )
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-64">
              <Select
                value={selectedCampaign}
                onValueChange={setSelectedCampaign}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحملة" />
                </SelectTrigger>
                <SelectContent>
                  <input
                    ref={campaignInputRef}
                    type="text"
                    placeholder="ابحث عن الحملة"
                    value={searchCampaign}
                    onChange={(e) => setSearchCampaign(e.target.value)}
                    onFocus={() => campaignInputRef.current?.focus()}
                    className="border border-gray-300 rounded-lg p-2 mb-2 w-full"
                  />
                  <SelectItem value="all">جميع الحملات</SelectItem>
                  {campaigns
                    .filter((campaign) =>
                      campaign.title.toLowerCase().includes(searchCampaign.toLowerCase())
                    )
                    .filter(
                      (campaign) =>
                        selectedCategory === "all" ||
                        campaign.categoryId === selectedCategory
                    )
                    .map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Donations Chart */}
        <div className="h-[400px] w-full">
          {chartLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { 
                      day: 'numeric',
                      month: 'short'
                    });
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  labelFormatter={(value) => 
                    new Date(value).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  }
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "المبلغ"]}
                />
                <Bar 
                  dataKey="amountUSD" 
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                  name="المبلغ"
                />
                <Line 
                  type="monotone" 
                  dataKey="amountUSD" 
                  stroke="#047857"
                  strokeWidth={2}
                  dot={false}
                  name="الاتجاه"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">أحدث الحملات</h2>
          <div className="space-y-4">
            {stats?.recentCampaigns?.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-gray-800">
                    {campaign.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(campaign.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-600">
                    ${campaign.currentAmount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    من ${campaign.targetAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Donations */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">أحدث التبرعات</h2>
          <div className="space-y-4">
            {stats?.recentDonations?.map((donation) => (
              <div
                key={donation.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-gray-800">
                    {donation.donorName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {donation.campaignTitle}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-600">
                    {donation.currency}{" "}
                    {donation.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(donation.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend: number;
  color: "emerald" | "blue" | "purple" | "amber";
  prefix?: string;
}

const StatsCard = ({
  title,
  value,
  icon,
  trend,
  color,
  prefix,
}: StatsCardProps) => {
  const colors = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colors[color]} bg-opacity-10`}>
          {icon}
        </div>
        <div
          className={`flex items-center gap-1 text-sm ${
            trend > 0 ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {trend > 0 ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          {Math.abs(trend)}%
        </div>
      </div>
      <h3 className="text-sm text-gray-600 mb-1">{title}</h3>
      <div className="text-2xl font-bold text-gray-800">
        <CountUp
          end={value}
          prefix={prefix}
          separator=","
          decimal="."
          decimals={0}
        />
      </div>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="h-20 bg-gray-200 rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 bg-gray-200 rounded-lg" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="h-96 bg-gray-200 rounded-lg" />
      ))}
    </div>
  </div>
);
