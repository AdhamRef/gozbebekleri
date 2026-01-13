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
  X,
  Menu,
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

// Define the navigation items without paths
const navigationItems = [
  { id: "account", label: "معلومات الحساب", icon: User },
  { id: "settings", label: "إعدادات الحساب", icon: Settings },
  { id: "donations", label: "التبرعات", icon: HandHeart },
  { id: "subscriptions", label: "اشتراكات التبرع الدوري", icon: Repeat },
  { id: "receipts", label: "الكشالات", icon: Receipt },
  { id: "support", label: "طلبات الدعم و المساعدة", icon: Headphones },
  { id: "logout", label: "تسجيل خروج", icon: LogOut },
];

const ProfilePage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [user, setUser] = useState(null);
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
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`/api/users/${id}`);
        setUser(response.data.user);
      } catch (err) {
        setError("Failed to fetch user data");
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
      toast.success("Account deleted");
    } catch (error) {
      toast.error("Failed to delete account. Please try again.");
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
      toast.success("تم تحديث المعلومات بنجاح");
    } catch (error) {
      toast.error("فشل تحديث المعلومات");
    }
  };

  const handleToggleSubscription = async (donation) => {
    setSelectedDonation(donation);
    setIsPauseDialogOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!selectedDonation) return;

    setIsLoading(true);
    try {
      const newStatus =
        selectedDonation.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      // Add donation type to help with validation
      const response = await axios.put(
        `/api/donations/${selectedDonation.id}`,
        {
          status: newStatus,
          type: selectedDonation.type, // Add this to help with validation
        }
      );

      // Update local state
      const updatedDonations = user.donations.map((d) =>
        d.id === selectedDonation.id ? { ...d, status: newStatus } : d
      );
      setUser({ ...user, donations: updatedDonations });

      toast.success(
        newStatus === "ACTIVE"
          ? "تم تفعيل الاشتراك الشهري"
          : "تم إيقاف الاشتراك الشهري مؤقتاً"
      );
    } catch (error) {
      console.error("Toggle error:", error); // Add this for debugging
      toast.error("حدث خطأ أثناء تحديث حالة الاشتراك");
    } finally {
      setIsLoading(false);
      setIsPauseDialogOpen(false);
      setSelectedDonation(null);
    }
  };

  const handleDownload = async (donationId: string) => {
    try {
      setIsDownloading(donationId);
      const response = await axios.get(`/api/donations/${donationId}/receipt`, {
        responseType: "blob",
        // Add timeout and retry logic
        timeout: 30000,
        validateStatus: (status) => status === 200,
      });

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

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success("تم تحميل الإيصال بنجاح");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("فشل تحميل الإيصال");
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setIsDownloading("all");
      for (const donation of user.donations || []) {
        await handleDownload(donation.id);
      }
      toast.success("تم تحميل جميع الإيصالات بنجاح");
    } catch (error) {
      toast.error("فشل تحميل بعض الإيصالات");
    } finally {
      setIsDownloading(null);
    }
  };

  const AccountInfo = () => (
    <div className="space-y-1 divide-y">
      <EditDialog
        title="الاسم"
        value={user.name}
        onSave={(value) => handleUpdateField("name", value)}
        icon={User}
      />

      <EditDialog
        title="البريد الإلكتروني"
        value={user.email}
        onSave={(value) => handleUpdateField("email", value)}
        icon={Mail}
      />

      <EditDialog
        title="البلد"
        value={user.country}
        onSave={(value) => handleUpdateField("country", value)}
        icon={Globe}
      />

      <EditDialog
        title="رقم الهاتف"
        value={user.phone}
        onSave={(value) => handleUpdateField("phone", value)}
        type="tel"
        icon={Phone}
      />

      <EditDialog
        title="تاريخ الميلاد"
        value={user.birthdate}
        onSave={(value) => handleUpdateField("birthdate", value)}
        type="date"
        icon={Calendar}
      />
    </div>
  );

  const Settings = () => (
    <div className="space-y-4 md:space-y-6">
      <Card className="p-3 md:p-4">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
          الإشعارات
        </h3>
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm md:text-base font-medium">
                إشعارات البريد الإلكتروني
              </h4>
              <p className="text-xs md:text-sm text-gray-500">
                تلقي تحديثات عبر البريد الإلكتروني
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm md:text-base font-medium">
                إشعارات الرسائل النصية
              </h4>
              <p className="text-xs md:text-sm text-gray-500">
                تلقي تحديثات عبر الرسائل النصية
              </p>
            </div>
            <Switch
              checked={smsNotifications}
              onCheckedChange={setSmsNotifications}
            />
          </div>
        </div>
      </Card>

      <Card className="p-3 md:p-4 border-red-200">
        <h3 className="text-base md:text-lg font-semibold text-red-600 mb-3 md:mb-4">
          حذف الحساب
        </h3>
        <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
          سيؤدي حذف حسابك إلى إزالة جميع بياناتك بشكل دائم. هذا الإجراء لا يمكن
          التراجع عنه.
        </p>
        <Button
          variant="destructive"
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          حذف الحساب
        </Button>
      </Card>
    </div>
  );

  const Donations = () => {
    const filteredDonations = user.donations?.filter((donation) => {
      const matchesType =
        selectedType === "all" || donation.type === selectedType;
      const date = new Date(donation.createdAt);
      const now = new Date();

      switch (selectedPeriod) {
        case "month":
          return (
            matchesType &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        case "year":
          return matchesType && date.getFullYear() === now.getFullYear();
        default:
          return matchesType;
      }
    });

    const totalAmount =
      filteredDonations?.reduce((sum, d) => sum + d.totalAmount, 0) || 0;
    const averageAmount = filteredDonations?.length
      ? totalAmount / filteredDonations.length
      : 0;

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card className="p-3 md:p-4">
            <h4 className="text-xs md:text-sm text-gray-500">
              إجمالي التبرعات
            </h4>
            <p className="text-lg md:text-2xl font-bold">
              ${totalAmount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {filteredDonations?.length || 0} تبرع
            </p>
          </Card>
          <Card className="p-3 md:p-4">
            <h4 className="text-xs md:text-sm text-gray-500">متوسط التبرع</h4>
            <p className="text-lg md:text-2xl font-bold">
              ${averageAmount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">لكل تبرع</p>
          </Card>
          <Card className="p-3 md:p-4">
            <h4 className="text-xs md:text-sm text-gray-500">
              التبرعات الشهرية
            </h4>
            <p className="text-lg md:text-2xl font-bold">
              {user.donations?.filter((d) => d.type === "MONTHLY").length || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">اشتراك نشط</p>
          </Card>
          <Card className="p-3 md:p-4">
            <h4 className="text-xs md:text-sm text-gray-500">
              الحملات المدعومة
            </h4>
            <p className="text-lg md:text-2xl font-bold">
              {
                new Set(
                  user.donations?.flatMap((d) =>
                    d.items.map((i) => i.campaignId)
                  )
                ).size
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">حملة</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full md:w-[180px] text-sm md:text-base">
              <SelectValue placeholder="الفترة الزمنية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفترات</SelectItem>
              <SelectItem value="month">هذا الشهر</SelectItem>
              <SelectItem value="year">هذا العام</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full md:w-[180px] text-sm md:text-base">
              <SelectValue placeholder="نوع التبرع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="ONE_TIME">تبرع لمرة واحدة</SelectItem>
              <SelectItem value="MONTHLY">تبرع شهري</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Donations List */}
        <Card>
          <ScrollArea className="h-[400px] md:h-[600px]">
            <Accordion type="single" collapsible className="w-full">
              {filteredDonations?.map((donation) => (
                <AccordionItem key={donation.id} value={donation.id}>
                  <AccordionTrigger className="px-2 md:px-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="bg-primary/10 p-1.5 md:p-2 rounded-full">
                          {donation.type === "MONTHLY" ? (
                            <Repeat className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                          ) : (
                            <HandHeart className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm md:text-base font-medium">
                            تبرع #{donation.id.slice(-4)}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500">
                            {new Date(donation.createdAt).toLocaleDateString(
                              "en-US"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 mt-2 md:mt-0">
                        <Badge
                          variant={
                            donation.status === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {donation.type === "MONTHLY" ? "شهري" : "مرة واحدة"}
                        </Badge>
                        <p className="text-sm md:text-base font-semibold">
                          ${donation.totalAmount}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-4 py-3 space-y-4">
                      {/* Donation Details */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">طريقة الدفع</p>
                          <p className="font-medium">
                            {donation.paymentMethod}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">الحالة</p>
                          <Badge variant="outline">{donation.status}</Badge>
                        </div>
                        {donation.type === "MONTHLY" && (
                          <div>
                            <p className="text-sm text-gray-500">
                              تاريخ التجديد
                            </p>
                            <p className="font-medium">
                              {new Date(
                                donation.nextBillingDate
                              ).toLocaleDateString("en-US")}
                            </p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Donation Items */}
                      <div className="space-y-3">
                        <h4 className="font-medium">تفاصيل التبرع</h4>
                        {donation.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center bg-secondary/50 p-3 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {item.campaign.images?.[0] && (
                                <img
                                  src={item.campaign.images[0]}
                                  alt={item.campaign.title}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <p className="font-medium">
                                  {item.campaign.title}
                                </p>
                                {donation.type === "MONTHLY" && (
                                  <p className="text-sm text-gray-500">
                                    تبرع شهري
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="font-semibold">${item.amount}</p>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {/* Calculations */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>المبلغ الأساسي</span>
                          <span>${donation.amount}</span>
                        </div>
                        {donation.teamSupport > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>دعم الفريق</span>
                            <span>${donation.teamSupport}</span>
                          </div>
                        )}
                        {donation.coverFees && (
                          <div className="flex justify-between text-sm">
                            <span>رسوم المعاملة</span>
                            <span>${donation.fees}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>الإجمالي</span>
                          <span>${donation.totalAmount}</span>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </Card>
      </div>
    );
  };

  const Subscriptions = () => {
    const monthlyDonations =
      user.donations?.filter((d) => d.type === "MONTHLY") || [];
    const activeDonations = monthlyDonations.filter(
      (d) => d.status === "ACTIVE"
    );
    const totalMonthly = monthlyDonations.reduce((sum, d) => sum + d.amount, 0);

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
          <Card className="p-3 md:p-4">
            <h4 className="text-xs md:text-sm text-gray-500">
              التبرعات الشهرية النشطة
            </h4>
            <p className="text-lg md:text-2xl font-bold">
              {activeDonations.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              من أصل {monthlyDonations.length} اشتراك
            </p>
          </Card>
          <Card className="p-3 md:p-4">
            <h4 className="text-xs md:text-sm text-gray-500">
              إجمالي التبرعات الشهرية
            </h4>
            <p className="text-lg md:text-2xl font-bold">
              ${totalMonthly.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">شهرياً</p>
          </Card>
          <Card className="p-3 md:p-4">
            <h4 className="text-xs md:text-sm text-gray-500">
              تاريخ التجديد القادم
            </h4>
            <p className="text-lg md:text-2xl font-bold">
              {activeDonations[0]?.nextBillingDate
                ? new Date(
                    activeDonations[0].nextBillingDate
                  ).toLocaleDateString("ar-EG")
                : "لا يوجد"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {activeDonations.length > 1 && "لأقرب اشتراك"}
            </p>
          </Card>
        </div>

        <div className="space-y-3 md:space-y-4">
          {monthlyDonations.map((subscription) => (
            <Card key={subscription.id} className="p-3 md:p-4">
              <div className="flex flex-col md:flex-row justify-between items-start mb-3 md:mb-4">
                <div>
                  <h3 className="text-sm md:text-base font-semibold">
                    اشتراك #{subscription.id.slice(-4)}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500">
                    تم الإنشاء:{" "}
                    {new Date(subscription.createdAt).toLocaleDateString(
                      "ar-EG"
                    )}
                  </p>
                  {subscription.status === "ACTIVE" && (
                    <p className="text-xs md:text-sm text-gray-500">
                      التجديد القادم:{" "}
                      {new Date(
                        subscription.nextBillingDate
                      ).toLocaleDateString("ar-EG")}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    subscription.status === "ACTIVE" ? "success" : "secondary"
                  }
                  className="mt-2 md:mt-0"
                >
                  {subscription.status === "ACTIVE" ? "نشط" : "متوقف مؤقتاً"}
                </Badge>
              </div>

              <div className="space-y-3">
                {subscription.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center bg-secondary/20 p-2 md:p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                      {item.campaign.images?.[0] && (
                        <img
                          src={item.campaign.images[0]}
                          alt={item.campaign.title}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm md:text-base font-medium">
                          {item.campaign.title}
                        </p>
                        <p className="text-xs md:text-sm text-gray-500">
                          ${item.amount} شهرياً
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={
                        subscription.status === "ACTIVE" ? "outline" : "default"
                      }
                      size="sm"
                      onClick={() => handleToggleSubscription(subscription)}
                      disabled={isLoading}
                      className={`mt-2 md:mt-0 w-full md:w-auto ${
                        subscription.status === "ACTIVE"
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      } text-white hover:text-white text-xs md:text-sm`}
                    >
                      <div className="flex items-center justify-center gap-1 md:gap-2">
                        {subscription.status === "ACTIVE" ? (
                          <>
                            <PauseCircle className="w-3 h-3 md:w-4 md:h-4" />
                            إيقاف مؤقت
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3 h-3 md:w-4 md:h-4" />
                            استئناف
                          </>
                        )}
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const Receipts = () => {
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState("all");
    const [selectedType, setSelectedType] = useState("all");

    const filteredReceipts = user?.donations?.filter((donation) => {
      const matchesType =
        selectedType === "all" || donation.type === selectedType;
      const date = new Date(donation.createdAt);
      const now = new Date();

      switch (selectedPeriod) {
        case "month":
          return (
            matchesType &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        case "year":
          return matchesType && date.getFullYear() === now.getFullYear();
        default:
          return matchesType;
      }
    });

    const handleDownload = async (donationId: string) => {
      try {
        setIsDownloading(donationId);
        const response = await axios.get(
          `/api/donations/${donationId}/receipt`,
          {
            responseType: "blob",
          }
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `receipt-${donationId.slice(-8)}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success("تم تحميل الإيصال بنجاح");
      } catch (error) {
        toast.error("فشل تحميل الإيصال");
      } finally {
        setIsDownloading(null);
      }
    };

    const handleDownloadAll = async () => {
      try {
        setIsDownloading("all");
        for (const donation of filteredReceipts || []) {
          await handleDownload(donation.id);
        }
        toast.success("تم تحميل جميع الإيصالات بنجاح");
      } catch (error) {
        toast.error("فشل تحميل بعض الإيصالات");
      } finally {
        setIsDownloading(null);
      }
    };

    return (
      <div className="space-y-4 md:space-y-6">
        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          <Card className="p-3 md:p-4">
            <h4 className="text-xs md:text-sm text-gray-500">عدد الإيصالات</h4>
            <p className="text-lg md:text-2xl font-bold">
              {filteredReceipts?.length || 0}
            </p>
          </Card>
          <Card className="p-3 md:p-4">
            <h4 className="text-xs md:text-sm text-gray-500">
              إجمالي التبرعات
            </h4>
            <p className="text-lg md:text-2xl font-bold">
              $
              {filteredReceipts
                ?.reduce((sum, d) => sum + d.totalAmount, 0)
                .toFixed(2) || "0.00"}
            </p>
          </Card>
          <Card className="p-3 md:p-4 col-span-2 lg:col-span-1">
            <h4 className="text-xs md:text-sm text-gray-500">متوسط التبرع</h4>
            <p className="text-lg md:text-2xl font-bold">
              $
              {filteredReceipts?.length
                ? (
                    filteredReceipts.reduce(
                      (sum, d) => sum + d.totalAmount,
                      0
                    ) / filteredReceipts.length
                  ).toFixed(2)
                : "0.00"}
            </p>
          </Card>
        </div>

        {/* Filters and Download All */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-4">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full md:w-auto">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full md:w-[180px] text-sm md:text-base">
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفترات</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="year">هذا العام</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[180px] text-sm md:text-base">
                <SelectValue placeholder="نوع التبرع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="ONE_TIME">تبرع لمرة واحدة</SelectItem>
                <SelectItem value="MONTHLY">تبرع شهري</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={handleDownloadAll}
            disabled={isDownloading !== null || !filteredReceipts?.length}
            className="w-full md:w-auto text-xs md:text-sm"
          >
            {isDownloading === "all" ? (
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2 animate-spin" />
            ) : (
              <Download className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
            )}
            تحميل الكل ({filteredReceipts?.length || 0})
          </Button>
        </div>

        {/* Receipts List */}
        <Card>
          <ScrollArea className="h-[400px] md:h-[600px]">
            <div className="p-2 md:p-4">
              {filteredReceipts?.length === 0 ? (
                <div className="text-center py-6 md:py-8 text-sm md:text-base text-gray-500">
                  لا توجد إيصالات متطابقة مع المعايير المحددة
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {filteredReceipts?.map((receipt) => (
                    <AccordionItem key={receipt.id} value={receipt.id}>
                      <AccordionTrigger className="px-2 md:px-4 py-2 md:py-3">
                        <div className="flex flex-col md:flex-row justify-between items-start w-full gap-2 md:gap-0">
                          <div className="flex items-center gap-2 md:gap-4">
                            <div className="bg-primary/10 p-1.5 md:p-2 rounded-full">
                              <Receipt className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm md:text-base font-medium">
                                إيصال #{receipt.id.slice(-4)}
                              </p>
                              <p className="text-xs md:text-sm text-gray-500">
                                {new Date(receipt.createdAt).toLocaleDateString(
                                  "ar-EG"
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 md:gap-4">
                            <Badge
                              variant="outline"
                              className="text-xs md:text-sm"
                            >
                              {receipt.type === "MONTHLY"
                                ? "شهري"
                                : "مرة واحدة"}
                            </Badge>
                            <p className="text-sm md:text-base font-semibold">
                              ${receipt.totalAmount}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="px-2 md:px-4 py-2 md:py-3 space-y-3 md:space-y-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(receipt.id)}
                            disabled={isDownloading === receipt.id}
                            className="w-full md:w-auto text-xs md:text-sm"
                          >
                            {isDownloading === receipt.id ? (
                              <Loader2 className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                            )}
                            تحميل الإيصال
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    );
  };

  const Support = () => (
    <div className="space-y-4 md:space-y-6">
      <Card className="p-3 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">
          طلب دعم جديد
        </h3>
        <div className="space-y-3 md:space-y-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm md:text-base">نوع الطلب</Label>
            <Select>
              <SelectTrigger className="text-sm md:text-base">
                <SelectValue placeholder="اختر نوع الطلب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">دعم فني</SelectItem>
                <SelectItem value="financial">دعم مالي</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm md:text-base">تفاصيل الطلب</Label>
            <Textarea
              placeholder="اكتب تفاصيل طلبك هنا..."
              className="h-24 md:h-32 text-sm md:text-base"
            />
          </div>
          <Button className="w-full text-sm md:text-base">إرسال الطلب</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">الطلبات السابقة</h3>
        <div className="space-y-4">
          {[1, 2].map((ticket) => (
            <div key={ticket} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">طلب #{ticket}</p>
                  <p className="text-sm text-gray-500">دعم فني</p>
                </div>
                <Badge variant="outline">مغلق</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                تفاصيل الطلب تظهر هنا...
              </p>
              <p className="text-sm text-gray-500">
                تم الإنشاء: {new Date().toLocaleDateString("en-US")}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return <AccountInfo />;
      case "settings":
        return <Settings />;
      case "donations":
        return <Donations />;
      case "subscriptions":
        return <Subscriptions />;
      case "receipts":
        return <Receipts />;
      case "support":
        return <Support />;
      case "logout":
        handleLogout();
        return null;
      default:
        return <div className="text-center text-gray-500">قريباً</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh] mt-[-80px]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  const Sidebar = () => (
    <Card className="p-3 md:p-4 h-full !rounded-none">
      <div className="flex flex-col items-center mb-4 md:mb-6">
        <Avatar className="w-16 h-16 md:w-20 md:h-20 mb-2">
          <AvatarImage src={user.image} />
          <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <h2 className="text-base md:text-lg font-semibold">{user.name}</h2>
        <p className="text-xs md:text-sm text-gray-500">{user.email}</p>
      </div>
      <nav className="space-y-1">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "logout") {
                handleLogout();
              } else {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }
              setSidebarOpen(!isSidebarOpen)
            }}
            className={`w-full flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-right text-sm md:text-base ${
              activeTab === item.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            }`}
          >
            {item.icon && <item.icon className="w-3 h-3 md:w-4 md:h-4" />}
            {item.label}
          </button>
        ))}
      </nav>
    </Card>
  );

  return (
    <>
      <Toaster />

      <button
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-16 left-2 z-50 p-2 bg-background rounded-lg shadow-lg"
      >
        {isSidebarOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <User className="w-5 h-5" />
        )}
      </button>

      <div className="max-w-7xl mx-auto p-2 md:p-4 lg:p-6">
        <div className="flex gap-4 md:gap-6">
          <div
            className={`lg:hidden mt-[60px] fixed inset-y-0 right-0 z-40 w-64 transform transition-transform duration-200 ease-in-out ${
              isSidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <Sidebar />
          </div>

          <div className="hidden lg:block w-64 shrink-0">
            <Sidebar />
          </div>

          <div className="flex-1">
            <Card className="p-3 md:p-4 lg:p-6">
              <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">
                {navigationItems.find((item) => item.id === activeTab)?.label}
              </h1>
              {renderContent()}
            </Card>
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف حسابك؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف حسابك بشكل دائم
              وإزالة بياناتك من خوادمنا.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف الحساب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProfilePage;
