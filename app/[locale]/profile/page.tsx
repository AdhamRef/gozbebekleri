"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster, toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check,
  HandHeart,
  Headphones,
  LogOut,
  Receipt,
  Repeat,
  Settings,
  User,
  ChevronLeft,
  Mail,
  Globe,
  Phone,
  Calendar,
  Edit2,
  Icon,
  Download,
  Loader2,
  PauseCircle,
  PlayCircle,
  ChevronRight,
  Bell,
  Shield,
  CreditCard,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import EditDialog from "./_components/EditDialog";
import { useLocale, useTranslations } from "next-intl";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

interface DonationForProfile {
  id: string;
  amount: number;
  amountUSD?: number | null;
  totalAmount: number;
  currency: string;
  type: string;
  status: string;
  billingDay?: number | null;
  nextBillingDate?: string | null;
  createdAt: string;
  teamSupport?: number;
  fees?: number;
  coverFees?: boolean;
  items: Array<{
    id: string;
    amount: number;
    amountUSD?: number | null;
    campaignId: string;
    campaign?: { title?: string; images?: string[] };
  }>;
  [key: string]: unknown;
}

interface UserProfile {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  country?: string | null;
  phone?: string | null;
  birthdate?: string | null;
  donations?: DonationForProfile[];
  [key: string]: unknown;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  TRY: "₺",
  SAR: "ر.س",
  AED: "د.إ",
};

function formatDonationAmount(amount: number, currency: string = "USD", amountUSD?: number | null) {
  const sym = CURRENCY_SYMBOLS[currency] || currency + " ";
  const value = typeof amount === "number" ? amount : 0;
  const formatted = value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${sym}${formatted}`;
}

const ProfilePage = () => {
  const router = useRouter();
  const t = useTranslations("Profile");
  const { data: session } = useSession();
  const locale = useLocale();
  const isRtl = locale === "ar";
  const { convertToCurrency } = useCurrency();

  const navigationItems = [
    { id: "account", label: t("nav.myinfo"), icon: User, description: t("nav.accountDesc") },
    { id: "donations", label: t("nav.donations"), icon: HandHeart, description: t("nav.donationsDesc") },
    { id: "support", label: t("nav.support"), icon: Headphones, description: t("nav.supportDesc") },
  ];

  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const id = session?.user?.id;
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<DonationForProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [subscriptionSettingsDonation, setSubscriptionSettingsDonation] = useState<DonationForProfile | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Read tab from URL query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && navigationItems.some(item => item.id === tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`/api/users/${id}`);
        setUser(response.data.user);
      } catch (err) {
        setError(t("misc.failedToFetchUser"));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserData();
    }
  }, [id]);

  const handleDeleteAccount = async () => {
    try {
      await axios.delete(`/api/users/${id}`);
      await signOut({ callbackUrl: "/" });
      toast.success(t("toast.accountDeleted"));
    } catch (error) {
      toast.error(t("toast.deleteAccountFailed"));
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleUpdateField = async (field: string, value: string) => {
    try {
      await axios.put(`/api/users/${id}`, {
        [field]: value,
      });
      setUser((prevUser) => ({ ...prevUser, [field]: value }));
      toast.success(t("toast.updateSuccess"));
    } catch (error) {
      toast.error(t("toast.updateFailed"));
    }
  };

  const handleToggleSubscription = (donation: DonationForProfile) => {
    setSelectedDonation(donation);
    setIsPauseDialogOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!selectedDonation) return;
    setIsLoading(true);
    try {
      const newStatus = selectedDonation.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const response = await axios.put(`/api/donations/${selectedDonation.id}`, {
        status: newStatus,
        billingDay: selectedDonation.billingDay ?? 1,
      });
      const updated = response.data as DonationForProfile;
      setUser((prev) => {
        if (!prev || !prev.donations) return prev;
        return {
          ...prev,
          donations: prev.donations.map((d) =>
            d.id === selectedDonation.id ? { ...d, ...updated } : d
          ),
        };
      });
      if (subscriptionSettingsDonation?.id === selectedDonation.id) {
        setSubscriptionSettingsDonation((prev) => (prev ? { ...prev, ...updated } : null));
      }
      toast.success(
        newStatus === "ACTIVE"
          ? t("toast.subscriptionActivated")
          : t("toast.subscriptionPaused")
      );
    } catch (error) {
      console.error("Toggle error:", error);
      toast.error(t("toast.subscriptionUpdateError"));
    } finally {
      setIsLoading(false);
      setIsPauseDialogOpen(false);
      setSelectedDonation(null);
      setSubscriptionSettingsDonation((prev) => (prev?.id === selectedDonation.id ? null : prev));
    }
  };

  const handleBillingDayChange = async (donationId: string, billingDay: number) => {
    try {
      const response = await axios.put(`/api/donations/${donationId}`, { billingDay });
      const updated = response.data as DonationForProfile;
      setUser((prev) => {
        if (!prev || !prev.donations) return prev;
        return {
          ...prev,
          donations: prev.donations.map((d) =>
            d.id === donationId ? { ...d, ...updated } : d
          ),
        };
      });
      setSubscriptionSettingsDonation((prev) => (prev?.id === donationId ? { ...prev, ...updated } : prev));
      toast.success(t("toast.updateSuccess"));
    } catch (error) {
      toast.error(t("toast.subscriptionUpdateError"));
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionSettingsDonation) return;
    setIsLoading(true);
    try {
      const response = await axios.put(`/api/donations/${subscriptionSettingsDonation.id}`, {
        status: "CANCELLED",
      });
      const updated = response.data as DonationForProfile;
      setUser((prev) => {
        if (!prev || !prev.donations) return prev;
        return {
          ...prev,
          donations: prev.donations.map((d) =>
            d.id === subscriptionSettingsDonation.id ? { ...d, ...updated } : d
          ),
        };
      });
      setSubscriptionSettingsDonation(null);
      setIsCancelDialogOpen(false);
      toast.success(t("toast.subscriptionCancelled"));
    } catch (error) {
      toast.error(t("toast.subscriptionUpdateError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (donationId: string) => {
    try {
      setIsDownloading(donationId);
      const localeParam = typeof locale === "string" ? locale : "en";
      const response = await axios.get(
        `/api/donations/${donationId}/receipt?locale=${encodeURIComponent(localeParam)}`,
        {
          responseType: "blob",
          timeout: 30000,
          validateStatus: (status) => status === 200,
        }
      );

      if (!(response.data instanceof Blob)) {
        throw new Error("Invalid response format");
      }

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `receipt-${donationId.slice(-8)}.pdf`);
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success(t("toast.receiptDownloadSuccess"));
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t("toast.receiptDownloadFailed"));
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setIsDownloading("all");
      for (const donation of user?.donations ?? []) {
        await handleDownload(donation.id);
      }
      toast.success(t("toast.allReceiptsDownloadSuccess"));
    } catch (error) {
      toast.error(t("toast.allReceiptsDownloadFailed"));
    } finally {
      setIsDownloading(null);
    }
  };

  // Account Section with improved organization
  const AccountInfo = ({ user: u }: { user: UserProfile }) => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
        <Avatar className="w-24 h-24 ring-4 ring-white shadow-xl">
          <AvatarImage src={u.image ?? undefined} alt={u.name ?? undefined} />
          <AvatarFallback className="text-2xl bg-primary text-white">
            {(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{u.name || t("account.name")}</h2>
          <p className="text-gray-600 mt-1">{u.email}</p>
          <Badge variant="secondary" className="mt-3">
            {t("account.verified")}
          </Badge>
        </div>
      </div>

      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          {t("account.personalInfo")}
        </h3>
        <Card className="divide-y divide-gray-100">
          <EditDialog
            title={t("account.name")}
            value={u.name ?? ""}
            onSave={(value: string) => handleUpdateField("name", value)}
            icon={User}
          />
          <EditDialog
            title={t("account.email")}
            value={u.email ?? ""}
            onSave={(value: string) => handleUpdateField("email", value)}
            icon={Mail}
          />
          <EditDialog
            title={t("account.country")}
            value={u.country ?? ""}
            onSave={(value: string) => handleUpdateField("country", value)}
            icon={Globe}
          />
          <EditDialog
            title={t("account.phone")}
            value={u.phone ?? ""}
            onSave={(value: string) => handleUpdateField("phone", value)}
            type="tel"
            icon={Phone}
          />
          <EditDialog
            title={t("account.birthdate")}
            value={u.birthdate ?? ""}
            onSave={(value: string) => handleUpdateField("birthdate", value)}
            type="date"
            icon={Calendar}
          />
        </Card>
      </div>

      {/* Security & Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {t("account.security")}
        </h3>
        <Card className="p-6 space-y-6">
          {/* Notifications */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {t("settings.notifications")}
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{t("settings.emailNotifications")}</h5>
                  <p className="text-sm text-gray-500 mt-1">{t("settings.emailNotificationsDesc")}</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{t("settings.smsNotifications")}</h5>
                  <p className="text-sm text-gray-500 mt-1">{t("settings.smsNotificationsDesc")}</p>
                </div>
                <Switch
                  checked={smsNotifications}
                  onCheckedChange={setSmsNotifications}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="p-4 border-2 border-red-200 bg-red-50/50 rounded-xl">
            <h4 className="font-semibold text-red-900 mb-2">{t("settings.deleteAccount")}</h4>
            <p className="text-sm text-red-700 mb-4">{t("settings.deleteAccountWarning")}</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              {t("settings.deleteAccountButton")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );

  // Donations Section with improved layout
  const Donations = ({ user: u }: { user: UserProfile }) => {
    const filteredDonations = u.donations?.filter((donation: DonationForProfile) => {
      const matchesType = selectedType === "all" || donation.type === selectedType;
      const date = new Date(donation.createdAt);
      const now = new Date();
      switch (selectedPeriod) {
        case "month":
          return matchesType && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        case "year":
          return matchesType && date.getFullYear() === now.getFullYear();
        default:
          return matchesType;
      }
    });

    const totalAmountUSD =
      filteredDonations?.reduce((sum: number, d: DonationForProfile) => sum + (d.amountUSD ?? d.totalAmount), 0) || 0;
    const totalAmountConverted = convertToCurrency(totalAmountUSD);
    const totalDisplayValue =
      totalAmountConverted?.convertedValue != null && totalAmountConverted?.currency
        ? totalAmountConverted.convertedValue
        : totalAmountUSD;`sideba`
    const totalDisplayCurrency = totalAmountConverted?.currency ?? "USD";
    const totalDisplaySymbol = CURRENCY_SYMBOLS[totalDisplayCurrency] || totalDisplayCurrency + " ";
    const totalDisplayFormatted =
      typeof totalDisplayValue === "number"
        ? totalDisplayValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : "0";
    const monthlyCount =
      u.donations?.filter(
        (d: DonationForProfile) =>
          d.type === "MONTHLY" && d.status === "ACTIVE"
      ).length || 0;
      const campaignCount =
      new Set(u.donations?.flatMap((d: DonationForProfile) => d.items?.map((i: { campaignId: string }) => i.campaignId) ?? [])).size;

    const statusLabel = (d: DonationForProfile) => {
      if (d.type !== "MONTHLY") return null;
      if (d.status === "ACTIVE") return t("subscriptions.active");
      if (d.status === "PAUSED") return t("subscriptions.paused");
      return t("subscriptions.cancelled");
    };

    return (
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 uppercase tracking-wide">
                  {t("donations.totalDonations")}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {totalDisplaySymbol}{totalDisplayFormatted}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {t("donations.donationsCount", { count: filteredDonations?.length || 0 })}
                </p>
              </div>
              <div className="p-3 bg-slate-200 rounded-xl">
                <HandHeart className="w-6 h-6 text-slate-700" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 uppercase tracking-wide">
                  {t("donations.monthlyDonations")}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{monthlyCount}</p>
                <p className="text-sm text-slate-600 mt-1">{t("donations.activeSubscription")}</p>
              </div>
              <div className="p-3 bg-slate-200 rounded-xl">
                <Repeat className="w-6 h-6 text-slate-700" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 uppercase tracking-wide">
                  {t("donations.supportedCampaigns")}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{campaignCount}</p>
                <p className="text-sm text-slate-600 mt-1">{t("donations.campaign")}</p>
              </div>
              <div className="p-3 bg-slate-200 rounded-xl">
                <CreditCard className="w-6 h-6 text-slate-700" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t("donations.timePeriod")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("donations.allPeriods")}</SelectItem>
                  <SelectItem value="month">{t("donations.thisMonth")}</SelectItem>
                  <SelectItem value="year">{t("donations.thisYear")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t("donations.donationType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("donations.all")}</SelectItem>
                  <SelectItem value="ONE_TIME">{t("donations.oneTime")}</SelectItem>
                  <SelectItem value="MONTHLY">{t("donations.monthly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={handleDownloadAll}
              disabled={isDownloading !== null || !filteredDonations?.length}
              className="gap-2"
            >
              {isDownloading === "all" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {t("receipts.downloadAll", { count: filteredDonations?.length || 0 })}
            </Button>
          </div>
        </Card>

        {/* Donations List */}
        <Card className="overflow-hidden">
          {filteredDonations?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Receipt className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">{t("receipts.noReceiptsMatch")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="hidden lg:table w-full" dir={isRtl ? "rtl" : "ltr"}>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className={cn("text-left font-semibold text-gray-700 py-4 px-6", isRtl && "text-right")}>
                      {t("donations.date")}
                    </th>
                    <th className={cn("text-left font-semibold text-gray-700 py-4 px-6", isRtl && "text-right")}>
                      {t("donations.donationType")}
                    </th>
                    <th className={cn("text-left font-semibold text-gray-700 py-4 px-6", isRtl && "text-right")}>
                      {t("donations.total")}
                    </th>
                    <th className={cn("text-left font-semibold text-gray-700 py-4 px-6", isRtl && "text-right")}>
                      {t("donations.status")}
                    </th>
                    <th className={cn("text-right font-semibold text-gray-700 py-4 px-6", isRtl && "text-left")}>
                      {t("donations.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDonations?.map((donation: DonationForProfile) => (
                    <tr key={donation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-gray-900">
                        {new Date(donation.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : undefined)}
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={donation.type === "MONTHLY" ? "default" : "secondary"}>
                          {donation.type === "MONTHLY" ? t("donations.monthly") : t("donations.oneTime")}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        {formatDonationAmount(donation.totalAmount, donation.currency, donation.amountUSD)}
                      </td>
                      <td className="py-4 px-6">
                        {donation.type === "MONTHLY" ? (
                          <Badge
                            variant="outline"
                            className={
                              donation.status === "ACTIVE"
                                ? "border-slate-300 bg-slate-50 text-slate-700"
                                : donation.status === "PAUSED"
                                  ? "border-amber-300 bg-amber-50 text-amber-700"
                                  : "border-gray-300 text-gray-600"
                            }
                          >
                            {statusLabel(donation)}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className={cn("py-4 px-6", isRtl ? "text-left" : "text-right")}>
                        <div className="flex items-center justify-end gap-2">
                          {donation.type === "MONTHLY" && donation.status !== "CANCELLED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSubscriptionSettingsDonation(donation)}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              {t("subscriptions.manage")}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(donation.id)}
                            disabled={isDownloading === donation.id}
                            title={t("receipts.downloadReceipt")}
                          >
                            {isDownloading === donation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-100">
                {filteredDonations?.map((donation: DonationForProfile) => (
                  <div key={donation.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg text-gray-900">
                          {formatDonationAmount(donation.totalAmount, donation.currency, donation.amountUSD)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(donation.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : undefined)}
                        </p>
                      </div>
                      <Badge variant={donation.type === "MONTHLY" ? "default" : "secondary"}>
                        {donation.type === "MONTHLY" ? t("donations.monthly") : t("donations.oneTime")}
                      </Badge>
                    </div>
                    {donation.type === "MONTHLY" && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{t("donations.status")}:</span>
                        <Badge
                          variant="outline"
                          className={
                            donation.status === "ACTIVE"
                              ? "border-slate-300 bg-slate-50 text-slate-700"
                              : donation.status === "PAUSED"
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : "border-gray-300 text-gray-600"
                          }
                        >
                          {statusLabel(donation)}
                        </Badge>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(donation.id)}
                        disabled={isDownloading === donation.id}
                      >
                        {isDownloading === donation.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        {t("receipts.download")}
                      </Button>
                      {donation.type === "MONTHLY" && donation.status !== "CANCELLED" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSubscriptionSettingsDonation(donation)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const Support = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-6">{t("support.newSupportRequest")}</h3>
        <div className="space-y-4">
          <div>
            <Label>{t("support.requestType")}</Label>
            <Select>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={t("support.chooseRequestType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">{t("support.technicalSupport")}</SelectItem>
                <SelectItem value="financial">{t("support.financialSupport")}</SelectItem>
                <SelectItem value="other">{t("support.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("support.requestDetails")}</Label>
            <Textarea
              placeholder={t("support.requestDetailsPlaceholder")}
              className="h-32 mt-2"
            />
          </div>
          <Button className="w-full">{t("support.sendRequest")}</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-6">{t("support.previousRequests")}</h3>
        <div className="space-y-4">
          {[1, 2].map((ticket) => (
            <div key={ticket} className="p-4 border rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">{t("support.requestLabel", { id: ticket })}</p>
                  <p className="text-sm text-gray-500 mt-1">{t("support.technicalSupport")}</p>
                </div>
                <Badge variant="outline">{t("support.closed")}</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {t("support.requestDetailsPreview")}
              </p>
              <p className="text-xs text-gray-400">
                {new Date().toLocaleDateString("en-US")}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const SubscriptionSettingsDialog = () => {
    const sub = subscriptionSettingsDonation;
    if (!sub) return null;
    const isActive = sub.status === "ACTIVE";
    return (
      <Dialog open={!!sub} onOpenChange={(open) => !open && setSubscriptionSettingsDonation(null)}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("subscriptions.subscriptionSettings")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-lg font-semibold text-gray-900">
                {formatDonationAmount(sub.totalAmount, sub.currency, sub.amountUSD)} {t("subscriptions.perMonth")}
              </p>
              {sub.items?.map((item: DonationForProfile["items"][0]) => (
                <p key={item.id} className="text-sm text-gray-600 mt-1">
                  • {item.campaign?.title}
                </p>
              ))}
            </div>
            {isActive && (
              <div>
                <Label className="text-sm font-medium">{t("subscriptions.billingDay")}</Label>
                <Select
                  value={String(sub.billingDay ?? 1)}
                  onValueChange={(v) => handleBillingDayChange(sub.id, Number(v))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {sub.status !== "CANCELLED" && (
                <Button
                  variant={isActive ? "outline" : "default"}
                  className="flex-1"
                  onClick={() => handleToggleSubscription(sub)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : isActive ? (
                    <>
                      <PauseCircle className="w-4 h-4 mr-2" />
                      {t("subscriptions.pause")}
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {t("subscriptions.resume")}
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => handleDownload(sub.id)}
                disabled={isDownloading === sub.id}
              >
                {isDownloading === sub.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
            {sub.status !== "CANCELLED" && (
              <>
                <Separator />
                <Button
                  variant="ghost"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setIsCancelDialogOpen(true)}
                >
                  {t("subscriptions.cancelSubscription")}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderContent = (currentUser: UserProfile) => {
    switch (activeTab) {
      case "account":
        return <AccountInfo user={currentUser} />;
      case "donations":
        return <Donations user={currentUser} />;
      case "support":
        return <Support />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-600 text-lg font-semibold">{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            {t("misc.tryAgain")}
          </Button>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Desktop sidebar only (mobile uses top tabs; no second burger)
  const Sidebar = () => (
    <div className="flex flex-col h-full rounded-2xl border border-gray-200 shadow-sm bg-white">
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col items-center text-center">
          <Avatar className="w-20 h-20 mb-4 ring-4 ring-primary/10">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? undefined} />
            <AvatarFallback className="text-xl bg-primary text-white">
              {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-semibold text-gray-900 truncate w-full">
            {user.name || t("account.name")}
          </h2>
          <p className="text-sm text-gray-500 truncate w-full mt-1">
            {user.email}
          </p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1" dir={isRtl ? "rtl" : "ltr"}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <div className="flex-1 text-left">
                <p className={cn(isActive ? "text-white" : "text-gray-900")}>{item.label}</p>
                {!isActive && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                )}
              </div>
              {isActive && <Check className="w-4 h-4" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>{t("nav.logout")}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Toaster position="top-center" />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
        {/* Mobile: horizontal tabs - sticky at very top */}
        <div className="lg:hidden sticky top-0 z-50 bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 pt-4 pb-4 px-4 sm:px-6 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-[1600px] mx-auto">
            <TabsList className="w-full grid grid-cols-3 h-12 p-1 bg-gray-100 rounded-xl">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex gap-8">
            {/* Desktop only: Sidebar */}
            <aside className="hidden lg:block w-80 shrink-0 sticky top-[104px] self-start">
              <Sidebar />
            </aside>

            {/* Main: on mobile use top tabs (no second burger); on desktop use title + content */}
            <main className="flex-1 min-w-0">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                {/* Desktop: page header with title + description */}
                <div className="hidden lg:block mb-8 pb-6 border-b border-gray-100">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {navigationItems.find((item) => item.id === activeTab)?.label}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    {navigationItems.find((item) => item.id === activeTab)?.description}
                  </p>
                </div>

                <div className={isRtl ? "text-right" : ""}>
                  {renderContent(user)}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedDonation?.status === "ACTIVE"
                ? t("subscriptions.pauseSubscription")
                : t("subscriptions.resume")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDonation?.status === "ACTIVE"
                ? t("pauseDialog.descriptionPause")
                : t("pauseDialog.descriptionResume")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : selectedDonation?.status === "ACTIVE" ? (
                t("subscriptions.pause")
              ) : (
                t("subscriptions.resume")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subscriptions.cancelSubscription")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("subscriptions.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SubscriptionSettingsDialog />
    </>
  );
};

export default ProfilePage;