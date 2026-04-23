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
  MapPin,
  Edit2,
  Icon,
  Loader2,
  PauseCircle,
  PlayCircle,
  ChevronRight,
  Bell,
  Shield,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
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
import ReactCountryFlag from "react-country-flag";

interface DonationForProfile {
  id: string;
  amount: number;
  amountUSD?: number | null;
  totalAmount: number;
  currency: string;
  type: string;
  /** PAID / FAILED for this charge (from API) */
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paidAt?: string | null;
  status: string | null;
  subscriptionId?: string | null;
  nextBillingDate?: string | null;
  createdAt: string;
  /** Earliest charge date for this subscription (client-only, subscriptions table) */
  subscriptionStartedAt?: string;
  teamSupport?: number;
  fees?: number;
  coverFees?: boolean;
  items: Array<{
    id: string;
    amount: number;
    amountUSD?: number | null;
    campaignId: string;
    shareCount?: number | null;
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
  countryCode?: string | null;
  countryName?: string | null;
  region?: string | null;
  city?: string | null;
  phone?: string | null;
  birthdate?: string | null;
  gender?: string | null;
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

function donationPaymentChargeStatus(d: Pick<DonationForProfile, "paymentStatus">) {
  return String(d.paymentStatus ?? "").toUpperCase();
}

function donationReceiptAllowed(d: Pick<DonationForProfile, "paymentStatus">) {
  return donationPaymentChargeStatus(d) === "PAID";
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
      setUser((prevUser) => {
        if (!prevUser) return prevUser;
        const next = { ...prevUser, [field]: value } as UserProfile;
        if (field === "countryName") next.country = value;
        return next;
      });
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

  const handleDownloadAll = async (donations: DonationForProfile[]) => {
    try {
      setIsDownloading("all");
      for (const donation of donations) {
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
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gradient-to-br from-[#025EB8]/5 to-[#025EB8]/10 rounded-2xl border border-[#025EB8]/20">
        <Avatar className="w-24 h-24 ring-4 ring-[#025EB8]/10 shadow-xl">
          <AvatarImage src={u.image ?? undefined} alt={u.name ?? undefined} />
          <AvatarFallback className="text-2xl bg-[#025EB8] text-white">
            {(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{u.name || t("account.name")}</h2>
          <p className="text-gray-600 mt-1">{u.email}</p>
          <Badge variant="secondary" className="mt-3 bg-[#025EB8]/10 text-[#025EB8] border-[#025EB8]/20">
            {t("account.verified")}
          </Badge>
        </div>
      </div>

      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-[#025EB8]" />
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 min-w-[140px]">
              <Globe className="w-4 h-4 text-[#025EB8]" />
              {t("account.location")}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
              {u.countryCode && /^[A-Za-z]{2}$/.test(u.countryCode) ? (
                <ReactCountryFlag
                  countryCode={u.countryCode.toUpperCase()}
                  svg
                  style={{ width: "1.25em", height: "1.25em" }}
                  title={u.countryCode}
                />
              ) : null}
              <span>{u.countryName ?? u.country ?? t("editDialog.notSpecified")}</span>
              {u.countryCode ? (
                <span className="text-xs text-muted-foreground">({u.countryCode})</span>
              ) : null}
              {(u.city || u.region) && (
                <span className="text-muted-foreground text-xs inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[u.city, u.region].filter(Boolean).join(" — ")}
                </span>
              )}
            </div>
          </div>
          <EditDialog
            title={t("account.countryName")}
            value={u.countryName ?? u.country ?? ""}
            onSave={(value: string) => handleUpdateField("countryName", value)}
            icon={Globe}
          />
          <EditDialog
            title={t("account.region")}
            value={u.region ?? ""}
            onSave={(value: string) => handleUpdateField("region", value)}
            icon={MapPin}
          />
          <EditDialog
            title={t("account.city")}
            value={u.city ?? ""}
            onSave={(value: string) => handleUpdateField("city", value)}
            icon={MapPin}
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
          <EditDialog
            title={t("account.gender")}
            value={u.gender ?? ""}
            onSave={(value: string) => handleUpdateField("gender", value)}
            icon={User}
          />
        </Card>
      </div>

      {/* Security & Preferences */}
      {/* <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#025EB8]" />
          {t("account.security")}
        </h3>
        <Card className="p-6 space-y-6">
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
      </div> */}
    </div>
  );

  // Donations tab: full donation history (all types) + subscriptions (one row per subscription)
  const Donations = ({ user: u }: { user: UserProfile }) => {
    const [paymentFilter, setPaymentFilter] = useState<"all" | "PAID" | "FAILED">("all");

    const matchesPeriod = (donation: DonationForProfile) => {
      const date = new Date(donation.createdAt);
      const now = new Date();
      switch (selectedPeriod) {
        case "month":
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        case "year":
          return date.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    };

    const donationsInPeriod =
      u.donations?.filter((d: DonationForProfile) => matchesPeriod(d)) ?? [];

    const isSuccessfulDonationCharge = (d: DonationForProfile) => donationReceiptAllowed(d);

    const successfulInPeriod = donationsInPeriod.filter(isSuccessfulDonationCharge);
    /** Only paid charges get an official PDF receipt */
    const forReceiptDownload = successfulInPeriod;

    const filteredHistory = donationsInPeriod.filter((d: DonationForProfile) => {
      if (paymentFilter === "all") return true;
      const s = donationPaymentChargeStatus(d);
      return s === paymentFilter;
    });

    const subscriptionRows: DonationForProfile[] = (() => {
      const monthly = (u.donations ?? []).filter(
        (d: DonationForProfile) => d.type === "MONTHLY" && d.subscriptionId
      );
      const bySub = new Map<string, DonationForProfile[]>();
      for (const d of monthly) {
        const sid = String(d.subscriptionId);
        const arr = bySub.get(sid) ?? [];
        arr.push(d);
        bySub.set(sid, arr);
      }
      return Array.from(bySub.values())
        .map((list) => {
          const desc = [...list].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          const asc = [...list].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const rep = desc[0];
          return {
            ...rep,
            subscriptionStartedAt: asc[0]?.createdAt ?? rep.createdAt,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.subscriptionStartedAt ?? b.createdAt).getTime() -
            new Date(a.subscriptionStartedAt ?? a.createdAt).getTime()
        );
    })();

    const totalHistoryUSD =
      successfulInPeriod.reduce((sum: number, d: DonationForProfile) => sum + (d.amountUSD ?? d.totalAmount), 0) || 0;
    const totalAmountConverted = convertToCurrency(totalHistoryUSD);
    const totalDisplayValue =
      totalAmountConverted?.convertedValue != null && totalAmountConverted?.currency
        ? totalAmountConverted.convertedValue
        : totalHistoryUSD;
    const totalDisplayCurrency = totalAmountConverted?.currency ?? "USD";
    const totalDisplaySymbol = CURRENCY_SYMBOLS[totalDisplayCurrency] || totalDisplayCurrency + " ";
    const totalDisplayFormatted =
      typeof totalDisplayValue === "number"
        ? totalDisplayValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : "0";

    const monthlyCount =
      u.donations?.filter(
        (d: DonationForProfile) => d.type === "MONTHLY" && d.status === "ACTIVE"
      ).length || 0;
    const campaignCount =
      new Set(
        (u.donations ?? [])
          .filter(isSuccessfulDonationCharge)
          .flatMap((d: DonationForProfile) => d.items?.map((i: { campaignId: string }) => i.campaignId) ?? [])
      ).size;

    const statusLabel = (d: DonationForProfile) => {
      if (d.status === "ACTIVE") return t("subscriptions.active");
      if (d.status === "PAUSED") return t("subscriptions.paused");
      return t("subscriptions.cancelled");
    };

    const subscriptionCampaignsLine = (d: DonationForProfile) =>
      d.items?.map((item: DonationForProfile["items"][0]) => item.campaign?.title).filter(Boolean).join(" · ") ||
      "—";

    const formatCampaignCell = (d: DonationForProfile) => {
      const items = d.items ?? [];
      if (items.length === 0) return t("donations.noCampaignTitle");
      return items
        .map((item: DonationForProfile["items"][0]) => {
          const title = item.campaign?.title?.trim() || t("donations.noCampaignTitle");
          const shares =
            item.shareCount != null && item.shareCount > 0
              ? ` (${t("donations.sharesCount", { count: item.shareCount })})`
              : "";
          return `${title}${shares}`;
        })
        .join(" · ");
    };

    const formatPaymentMethod = (d: DonationForProfile) => {
      const pm = String(d.paymentMethod ?? "").toUpperCase();
      if (pm === "CARD") return t("donations.paymentMethodCard");
      if (pm === "PAYPAL") return t("donations.paymentMethodPaypal");
      return "—";
    };

    const paymentResultLabel = (d: DonationForProfile) => {
      const s = donationPaymentChargeStatus(d);
      if (s === "PAID") return t("donations.paymentSucceeded");
      if (s === "FAILED") return t("donations.paymentFailed");
      return t("donations.paymentUnknown");
    };

    const formatBillingDate = (iso?: string | null) =>
      iso
        ? new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : undefined)
        : t("subscriptions.noDate");

    const emptyTable = (message: string) => (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 border-t border-gray-100">
        <Receipt className="w-12 h-12 mb-3 text-[#025EB8] opacity-60" />
        <p className="text-sm font-medium text-center px-4">{message}</p>
      </div>
    );

    return (
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-[#025EB8]/5 to-[#025EB8]/10 border-[#025EB8]/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#025EB8] uppercase tracking-wide">
                  {t("donations.totalInPeriodTitle")}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {totalDisplaySymbol}
                  {totalDisplayFormatted}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {t("donations.successfulPaymentsInPeriod", { count: successfulInPeriod.length })}
                </p>
              </div>
              <div className="p-3 bg-[#025EB8]/10 rounded-xl">
                <HandHeart className="w-6 h-6 text-[#025EB8]" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-[#FA5D17]/5 to-[#FA5D17]/10 border-[#FA5D17]/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#FA5D17] uppercase tracking-wide">
                  {t("donations.monthlyDonations")}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{monthlyCount}</p>
                <p className="text-sm text-gray-600 mt-1">{t("donations.activeSubscription")}</p>
              </div>
              <div className="p-3 bg-[#FA5D17]/10 rounded-xl">
                <Repeat className="w-6 h-6 text-[#FA5D17]" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-[#025EB8]/5 to-[#025EB8]/10 border-[#025EB8]/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#025EB8] uppercase tracking-wide">
                  {t("donations.supportedCampaigns")}
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{campaignCount}</p>
                <p className="text-sm text-gray-600 mt-1">{t("donations.campaign")}</p>
              </div>
              <div className="p-3 bg-[#025EB8]/10 rounded-xl">
                <CreditCard className="w-6 h-6 text-[#025EB8]" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t("donations.timePeriod")}
                </p>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={t("donations.timePeriod")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("donations.allPeriods")}</SelectItem>
                    <SelectItem value="month">{t("donations.thisMonth")}</SelectItem>
                    <SelectItem value="year">{t("donations.thisYear")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t("donations.filterByPayment")}
                </p>
                <Select
                  value={paymentFilter}
                  onValueChange={(v) => setPaymentFilter(v as "all" | "PAID" | "FAILED")}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("donations.filterPaymentAll")}</SelectItem>
                    <SelectItem value="PAID">{t("donations.filterPaymentPaid")}</SelectItem>
                    <SelectItem value="FAILED">{t("donations.filterPaymentFailed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0">
              <Button
                variant="outline"
                onClick={() => handleDownloadAll(forReceiptDownload)}
                disabled={isDownloading !== null || forReceiptDownload.length === 0}
                className="gap-2 border-[#025EB8] text-[#025EB8] hover:bg-[#025EB8]/5 whitespace-normal h-auto min-h-10 py-2 px-3"
              >
                {isDownloading === "all" ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Receipt className="w-4 h-4 shrink-0" />
                )}
                <span className="text-left">{t("receipts.downloadAllPdf", { count: forReceiptDownload.length })}</span>
              </Button>
              <p className="text-xs text-gray-500 max-w-xs sm:text-right leading-snug">
                {t("receipts.downloadAllHint")}
              </p>
            </div>
          </div>
        </Card>

        {/* All donation charges (one-time + each monthly payment) */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <HandHeart className="w-5 h-5 text-[#025EB8]" />
              {t("donations.historyTableTitle")}
            </h3>
            <p className="text-sm text-gray-600 mt-1 max-w-3xl">{t("donations.historyTableSubtitle")}</p>
          </div>
          <Card className="overflow-hidden border-gray-200 shadow-sm">
            {filteredHistory.length === 0 ? (
              emptyTable(
                donationsInPeriod.length === 0
                  ? t("donations.emptyHistoryList")
                  : t("donations.emptyHistoryFiltered")
              )
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
              <table
                className="w-full text-sm table-fixed"
                dir={isRtl ? "rtl" : "ltr"}
              >
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className={cn("font-semibold text-gray-800 py-3 px-3 w-32", isRtl ? "text-right" : "text-left")}>
                      {t("donations.date")}
                    </th>
                    <th className={cn("font-semibold text-gray-800 py-3 px-3", isRtl ? "text-right" : "text-left")}>
                      {t("donations.campaignsColumn")}
                    </th>
                    <th className={cn("font-semibold text-gray-800 py-3 px-3 w-28", isRtl ? "text-right" : "text-left")}>
                      {t("donations.baseAmount")}
                    </th>
                    <th className={cn("font-semibold text-gray-800 py-3 px-3 w-28", isRtl ? "text-right" : "text-left")}>
                      {t("donations.teamSupport")}
                    </th>
                    <th className={cn("font-semibold text-gray-800 py-3 px-3 w-24", isRtl ? "text-right" : "text-left")}>
                      {t("donations.transactionFees")}
                    </th>
                    <th className={cn("font-semibold text-gray-800 py-3 px-3 w-20", isRtl ? "text-left" : "text-right")}>
                      {t("donations.receipt")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredHistory
                    /* 1. Only show successfully PAID donations */
                    .filter((d) => donationPaymentChargeStatus(d) === "PAID")
                    .map((donation: DonationForProfile) => {
                      const team = donation.teamSupport ?? 0;
                      const fees = donation.fees ?? 0;
                      const base = donation.amount ?? 0;
            
                      return (
                        <tr key={donation.id} className="hover:bg-slate-50 transition-colors">
                          {/* Date */}
                          <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                            {new Date(donation.createdAt).toLocaleDateString(
                              locale === "ar" ? "ar-EG" : undefined,
                              { day: "numeric", month: "short", year: "numeric" }
                            )}
                          </td>
            
                          {/* Campaign */}
                          <td className="py-3 px-3 text-gray-800">
                            <p className="truncate font-medium" title={formatCampaignCell(donation)}>
                              {formatCampaignCell(donation)}
                            </p>
                          </td>
            
                          {/* Base Amount */}
                          <td className="py-3 px-3 text-gray-700">
                            {formatDonationAmount(base, donation.currency)}
                          </td>
            
                          {/* Team Support */}
                          <td className="py-3 px-3 text-gray-700">
                            {team > 0 ? formatDonationAmount(team, donation.currency) : "—"}
                          </td>
            
                          {/* Fees */}
                          <td className="py-3 px-3 text-gray-700">
                            {fees > 0 ? formatDonationAmount(fees, donation.currency) : "—"}
                          </td>
            
                          {/* Receipt - Fixed disabled state */}
                          <td className={cn("py-3 px-3", isRtl ? "text-left" : "text-right")}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#025EB8] hover:bg-[#025EB8]/10"
                              onClick={() => handleDownload(donation.id)}
                              /* Removed restrictive disabled check to ensure it works */
                              disabled={isDownloading === donation.id}
                            >
                              {isDownloading === donation.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Receipt className="w-4 h-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            )}
          </Card>
        </div>

        {/* Subscriptions (one row per subscription — settings & billing) */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-[#025EB8]" />
            {t("subscriptions.settingsTableTitle")}
          </h3>
          <Card className="overflow-hidden">
            {subscriptionRows.length === 0 ? (
              emptyTable(t("subscriptions.emptySubscriptionsList"))
            ) : (
              <div className="overflow-x-auto">
                <table className="hidden lg:table w-full" dir={isRtl ? "rtl" : "ltr"}>
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className={cn("text-left font-semibold text-gray-700 py-4 px-6", isRtl && "text-right")}>
                        {t("subscriptions.sinceDate")}
                      </th>
                      <th className={cn("text-left font-semibold text-gray-700 py-4 px-6", isRtl && "text-right")}>
                        {t("donations.monthlyDonationLabel")}
                      </th>
                      <th className={cn("text-left font-semibold text-gray-700 py-4 px-6", isRtl && "text-right")}>
                        {t("donations.status")}
                      </th>
                      <th className={cn("text-left font-semibold text-gray-700 py-4 px-6", isRtl && "text-right")}>
                        {t("donations.nextBillingDate")}
                      </th>
                      <th className={cn("text-left font-semibold text-gray-700 py-4 px-6 min-w-[8rem]", isRtl && "text-right")}>
                        {t("donations.supportedCampaigns")}
                      </th>
                      <th className={cn("text-right font-semibold text-gray-700 py-4 px-6", isRtl && "text-left")}>
                        {t("donations.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subscriptionRows.map((donation: DonationForProfile) => (
                      <tr key={donation.subscriptionId ?? donation.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 text-gray-900 whitespace-nowrap">
                          {new Date(donation.subscriptionStartedAt ?? donation.createdAt).toLocaleDateString(
                            locale === "ar" ? "ar-EG" : undefined
                          )}
                        </td>
                        <td className="py-4 px-6 font-semibold text-gray-900 whitespace-nowrap">
                          {formatDonationAmount(donation.totalAmount, donation.currency, donation.amountUSD)}
                          <span className="text-sm font-normal text-gray-500"> {t("subscriptions.perMonth")}</span>
                        </td>
                        <td className="py-4 px-6">
                          <Badge
                            variant="outline"
                            className={
                              donation.status === "ACTIVE"
                                ? "border-green-300 bg-green-50 text-green-700"
                                : donation.status === "PAUSED"
                                  ? "border-amber-300 bg-amber-50 text-amber-700"
                                  : "border-gray-300 text-gray-600"
                            }
                          >
                            {statusLabel(donation)}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-gray-700 text-sm whitespace-nowrap">
                          {formatBillingDate(donation.nextBillingDate)}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 max-w-[14rem] truncate" title={subscriptionCampaignsLine(donation)}>
                          {subscriptionCampaignsLine(donation)}
                        </td>
                        <td className={cn("py-4 px-6 whitespace-nowrap", isRtl ? "text-left" : "text-right")}>
                          <div className="flex items-center justify-end gap-2">
                            {donation.status !== "CANCELLED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSubscriptionSettingsDonation(donation)}
                              >
                                <Settings className={cn("w-4 h-4", isRtl ? "ml-2" : "mr-2")} />
                                {t("subscriptions.manage")}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 shrink-0 border-[#025EB8]/40 text-[#025EB8] hover:bg-[#025EB8]/10"
                              onClick={() => handleDownload(donation.id)}
                              disabled={isDownloading === donation.id || !donationReceiptAllowed(donation)}
                              title={
                                donationReceiptAllowed(donation)
                                  ? t("receipts.downloadPdfReceipt")
                                  : t("receipts.receiptNotAvailableReason")
                              }
                            >
                              {isDownloading === donation.id ? (
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                              ) : (
                                <Receipt className="w-4 h-4 shrink-0" />
                              )}
                              <span className="hidden 2xl:inline">{t("receipts.downloadPdfShort")}</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="lg:hidden divide-y divide-gray-100">
                  {subscriptionRows.map((donation: DonationForProfile) => (
                    <div key={donation.subscriptionId ?? donation.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-lg text-gray-900">
                            {formatDonationAmount(donation.totalAmount, donation.currency, donation.amountUSD)}
                            <span className="text-sm font-normal text-gray-500"> {t("subscriptions.perMonth")}</span>
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {t("subscriptions.sinceDate")}:{" "}
                            {new Date(donation.subscriptionStartedAt ?? donation.createdAt).toLocaleDateString(
                              locale === "ar" ? "ar-EG" : undefined
                            )}
                          </p>
                        </div>
                        <Badge variant="default">{t("donations.monthly")}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-gray-600">{t("donations.status")}:</span>
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
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{t("donations.nextBillingDate")}: </span>
                        {formatBillingDate(donation.nextBillingDate)}
                      </p>
                      {subscriptionCampaignsLine(donation) !== "—" && (
                        <p className="text-sm text-gray-600 line-clamp-2">{subscriptionCampaignsLine(donation)}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2 border-[#025EB8]/40 text-[#025EB8] hover:bg-[#025EB8]/10"
                          onClick={() => handleDownload(donation.id)}
                          disabled={isDownloading === donation.id || !donationReceiptAllowed(donation)}
                          title={
                            donationReceiptAllowed(donation)
                              ? t("receipts.downloadPdfReceipt")
                              : t("receipts.receiptNotAvailableReason")
                          }
                        >
                          {isDownloading === donation.id ? (
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          ) : (
                            <Receipt className="w-4 h-4 shrink-0" />
                          )}
                          {t("receipts.downloadPdfReceipt")}
                        </Button>
                        {donation.status !== "CANCELLED" && (
                          <Button variant="secondary" size="sm" onClick={() => setSubscriptionSettingsDonation(donation)}>
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
          <Button className="w-full bg-[#025EB8] hover:bg-[#014fa0] text-white">{t("support.sendRequest")}</Button>
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
            <div className="p-4 bg-[#025EB8]/5 border border-[#025EB8]/10 rounded-xl">
              <p className="text-lg font-semibold text-gray-900">
                {formatDonationAmount(sub.totalAmount, sub.currency, sub.amountUSD)} {t("subscriptions.perMonth")}
              </p>
              {sub.items?.map((item: DonationForProfile["items"][0]) => (
                <p key={item.id} className="text-sm text-gray-600 mt-1">
                  • {item.campaign?.title}
                </p>
              ))}
            </div>
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
                className="gap-2 border-[#025EB8]/40 text-[#025EB8] hover:bg-[#025EB8]/10"
                onClick={() => handleDownload(sub.id)}
                disabled={isDownloading === sub.id || !donationReceiptAllowed(sub)}
                title={
                  donationReceiptAllowed(sub)
                    ? t("receipts.downloadPdfReceipt")
                    : t("receipts.receiptNotAvailableReason")
                }
              >
                {isDownloading === sub.id ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Receipt className="w-4 h-4 shrink-0" />
                )}
                {t("receipts.downloadPdfShort")}
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
          <Loader2 className="w-12 h-12 animate-spin text-[#025EB8] mx-auto mb-4" />
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
          <Avatar className="w-20 h-20 mb-4 ring-4 ring-[#025EB8]/10">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? undefined} />
            <AvatarFallback className="text-xl bg-[#025EB8] text-white">
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
                  ? "bg-[#025EB8] text-white shadow-md shadow-[#025EB8]/20"
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

      <div className="min-h-screen bg-gray-50">
        {/* Mobile: horizontal tabs - sticky at very top */}
        <div className="lg:hidden sticky top-0 z-50 bg-gray-50 pt-4 pb-4 px-4 sm:px-6 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-[1600px] mx-auto">
            <TabsList className="w-full grid grid-cols-3 h-12 p-1 bg-[#025EB8]/8 rounded-xl">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-[#025EB8] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg"
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
                  <div className="border-l-4 border-[#FA5D17] pl-4">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {navigationItems.find((item) => item.id === activeTab)?.label}
                    </h1>
                    <p className="text-gray-600 mt-2">
                      {navigationItems.find((item) => item.id === activeTab)?.description}
                    </p>
                  </div>
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