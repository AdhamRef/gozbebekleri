'use client'
import React, { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, HandCoins, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Spinner from "../components/ui/spinner";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface CartItem {
  id: string;
  amount: number;
  amountUSD: number;
  currency: string;
  campaign: {
    id: string;
    title: string;
    images: string[];
    translations?: { locale: string; title: string }[];
  };
}

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  handleRemoveItem: (id: string) => Promise<void>;
  onOpenDonationDialog: () => void;
}

const CartSheet: React.FC<CartSheetProps> = ({
  open,
  onOpenChange,
  cartItems,
  handleRemoveItem,
  onOpenDonationDialog,
}) => {
  const t = useTranslations('CartSheet');
  const locale = useLocale() as 'ar' | 'en' | 'fr';
  const isRTL = locale === 'ar';
  const router = useRouter();
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const items = Array.isArray(cartItems) ? cartItems : [];

  // Calculate totals from cart items
  const totals = useMemo(() => {
    const totalUSD = items.reduce((sum, item) => sum + (item.amountUSD || item.amount), 0);
    const itemCount = items.length;
    return { totalUSD, itemCount };
  }, [items]);

  const handleDelete = async (id: string) => {
    setRemovingItemId(id);
    setLoadingItemId(id);
    try {
      await handleRemoveItem(id);
    } finally {
      setLoadingItemId(null);
      setTimeout(() => setRemovingItemId(null), 300);
    }
  };

  const handleCheckout = () => {
    onOpenChange(false);
    onOpenDonationDialog();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isRTL ? "left" : "right"} 
        className={cn(
          "w-full sm:max-w-lg p-0 flex flex-col",
          isRTL && "sm:max-w-lg"
        )}
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-sky-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 rounded-full">
                <ShoppingBag className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-gray-900">
                  {t('myDonationCart')}
                </SheetTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {totals.itemCount} {totals.itemCount === 1 ? t('item') : t('items')}
                </p>
              </div>
            </div>

          </div>
        </SheetHeader>

        {/* Cart Items */}
        <ScrollArea className="flex-1 px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <ShoppingBag className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('emptyCart')}
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs">
                {t('emptyCartMessage')}
              </p>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  router.push('/campaigns');
                }}
                variant="outline"
                className="gap-2"
              >
                <ShoppingBag className="h-4 w-4" />
                {t('browseCampaigns')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const campaignTitle =
                  item.campaign.translations?.find((tr) => tr.locale === locale)?.title ??
                  item.campaign.title;
                return (
                <div
                  key={item.id}
                  className={cn(
                    "group relative bg-white border border-gray-200 rounded-xl p-4 transition-all duration-300 hover:shadow-md",
                    removingItemId === item.id && "opacity-50 scale-95"
                  )}
                >
                  <div className="flex gap-4">
                    {/* Campaign Image */}
                    <div className="relative flex-shrink-0">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={item.campaign.images[0]}
                          alt={campaignTitle}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>

                    {/* Campaign Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-3 mb-2 leading-tight">
                        {campaignTitle}
                      </h3>
                      
                      {/* Amount Display */}
                      <div className="flex items-center gap-2 mt-auto">
                        <div className="inline-flex items-center gap-1.5 bg-sky-50 px-3 py-1.5 rounded-full">
                          <HandCoins className="h-4 w-4 text-sky-600" />
                          <span className="text-sm font-bold text-sky-700">
                            {new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
                              style: "currency",
                              currency: item.currency,
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            }).format(item.amount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="flex-shrink-0">
                      {loadingItemId === item.id ? (
                        <div className="p-2">
                          <Spinner className="h-5 w-5 text-gray-400" />
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all",
                            "opacity-0 group-hover:opacity-100"
                          )}
                          disabled={loadingItemId === item.id}
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer with Summary and Checkout */}
        {items.length > 0 && (
          <div className="border-t bg-white">
            {/* Summary */}
            <div className="px-6 py-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('subtotal')}</span>
                <span className="font-semibold text-gray-900">
                  {new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  }).format(totals.totalUSD)}
                </span>
              </div>
              
              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">
                  {t('total')}
                </span>
                <span className="text-2xl font-bold text-sky-600">
                  {new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  }).format(totals.totalUSD)}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="px-6 pb-6">
              <Button
                onClick={handleCheckout}
                className={cn(
                  "w-full h-12 text-base font-bold shadow-lg",
                  "bg-gradient-to-r from-sky-600 to-sky-500",
                  "hover:from-sky-700 hover:to-sky-600",
                  "active:scale-[0.98] transition-all",
                  "gap-2"
                )}
              >
                <HandCoins className="h-5 w-5" />
                {t('proceedToDonate')}
              </Button>
              
              <p className="text-xs text-center text-gray-500 mt-3">
                {t('secureCheckout')}
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;