"use client";

import * as React from "react";
import {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { LOCALE_LABELS } from "@/lib/locales";
import {
  UserCircle,
  Mail,
  Globe,
  Phone,
  Calendar,
  Hash,
  Award,
  MapPin,
  Receipt,
} from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { DASHBOARD_PERMISSION_ROWS } from "@/lib/dashboard/nav-config";
import type { UserProfileCardData } from "@/lib/dashboard/user-profile-card";

export interface ViewUserBadgeOption {
  id: string;
  name: string;
  translatedName?: string;
  color: string;
}

export function ViewUserProfileDialog({
  open,
  user,
  badges,
  loading,
  onOpenChange,
}: {
  open: boolean;
  user: UserProfileCardData | null;
  badges: ViewUserBadgeOption[];
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { convertToCurrency } = useCurrency();

  const formatMoney = (n: number) => {
    const r = convertToCurrency(n);
    if (r?.convertedValue != null && r?.currency) {
      const sym =
        r.currency === "USD"
          ? "$"
          : r.currency === "EUR"
            ? "€"
            : r.currency === "GBP"
              ? "£"
              : r.currency;
      return (
        sym +
        " " +
        (typeof r.convertedValue === "number"
          ? r.convertedValue.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })
          : "0")
      );
    }
    return (
      "$" +
      (typeof n === "number"
        ? n.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })
        : "0")
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="fixed inset-0 bg-black/30" />
      <DialogContent
        className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl p-0 transform -translate-x-1/2 -translate-y-1/2 border border-border rounded-xl shadow-xl bg-card"
        {...({
          closeClassName:
            "left-4 right-auto text-white hover:text-white opacity-90 hover:opacity-100",
        } as React.ComponentProps<typeof DialogContent>)}
        dir="rtl"
        aria-labelledby="view-user-title-global"
      >
        {loading && (
          <div className="p-12 flex items-center justify-center bg-background">
            <div className="text-sm text-muted-foreground">جاري تحميل الملف…</div>
          </div>
        )}
        {!loading && user && (
          <>
            <DialogTitle id="view-user-title-global" className="sr-only">
              ملف المستخدم — {user.name ?? user.email ?? user.id}
            </DialogTitle>
            <div className="rounded-xl overflow-hidden">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 text-white px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
                    {user.image ? (
                      <img src={user.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-8 h-8 text-white/80" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold truncate">{user.name || "—"}</h2>
                    <p className="text-white/80 text-sm truncate">{user.email || "—"}</p>
                    <span
                      className={cn(
                        "inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium",
                        user.role === "ADMIN"
                          ? "bg-[#FA5D17]/8/90 text-white"
                          : user.role === "STAFF"
                            ? "bg-[#025EB8]/90 text-white"
                            : "bg-white/20 text-white"
                      )}
                    >
                      {user.role === "ADMIN"
                        ? "مدير"
                        : user.role === "STAFF"
                          ? "طاقم"
                          : "متبرع"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4 bg-background">
                <div className="grid grid-cols-[1.6fr_1fr] gap-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                      <UserCircle className="w-4 h-4" /> الحساب
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground shrink-0">البريد:</span>
                      <span className="font-medium truncate" title={user.email ?? undefined}>
                        {user.email ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground shrink-0">اللغة:</span>
                      <span className="font-medium">
                        {LOCALE_LABELS[user.preferredLang as keyof typeof LOCALE_LABELS] ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground shrink-0">الدولة:</span>
                      <span className="font-medium inline-flex items-center gap-1.5 min-w-0">
                        {user.countryCode && /^[A-Za-z]{2}$/.test(user.countryCode) ? (
                          <ReactCountryFlag
                            countryCode={user.countryCode.toUpperCase()}
                            svg
                            style={{ width: "1.15em", height: "1.15em" }}
                          />
                        ) : null}
                        <span className="truncate">
                          {user.countryName ?? user.country ?? "—"}
                        </span>
                        {user.countryCode ? (
                          <span className="text-muted-foreground text-xs shrink-0">
                            ({user.countryCode})
                          </span>
                        ) : null}
                      </span>
                    </div>
                    {(user.city || user.region) && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground shrink-0">المدينة / المنطقة:</span>
                        <span className="font-medium">
                          {[user.city, user.region].filter(Boolean).join(" — ") || "—"}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground shrink-0">الهاتف:</span>
                      <span className="font-medium dir-ltr">{user.phone ?? "—"}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                      <Receipt className="w-4 h-4" /> التبرعات
                    </h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">عدد التبرعات</span>
                        <span className="font-medium">{user.totalDonationsCount ?? "—"}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">الإجمالي (USD)</span>
                        <span className="font-medium dir-ltr">
                          {user.totalDonatedAmountUSD != null
                            ? formatMoney(user.totalDonatedAmountUSD)
                            : "—"}
                        </span>
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
                      {user.role === "ADMIN"
                        ? "مدير — وصول كامل لجميع حملات لوحة التحكم"
                        : user.role === "STAFF"
                          ? "عضو طاقم — وصول جزئي حسب الحملات أدناه"
                          : "متبرع"}
                    </span>
                  </p>
                  {user.role === "STAFF" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(user.dashboardPermissions ?? []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">لا توجد حملات مفعّلة</span>
                      ) : (
                        (user.dashboardPermissions ?? []).map((key) => {
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

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4" /> التواريخ
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">تاريخ التسجيل</p>
                      <p className="font-medium mt-0.5">
                        {new Date(user.createdAt).toLocaleDateString("ar-EG", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">آخر تبرع</p>
                      <p className="font-medium mt-0.5">
                        {user.lastDonationAt
                          ? new Date(user.lastDonationAt).toLocaleDateString("ar-EG", {
                              dateStyle: "medium",
                            })
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">آخر تحديث</p>
                      <p className="font-medium mt-0.5">
                        {new Date(user.updatedAt).toLocaleDateString("ar-EG", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border">
                    <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span
                      className="text-muted-foreground text-sm font-mono truncate"
                      title={user.id}
                    >
                      {user.id}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4" /> الشارات
                  </h3>
                  {(user.badgeIds ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.badgeIds.map((bid) => {
                        const badge = badges.find((b) => b.id === bid);
                        if (!badge) return null;
                        return (
                          <span
                            key={bid}
                            className="inline-flex px-2.5 py-1 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: badge.color }}
                          >
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
  );
}
