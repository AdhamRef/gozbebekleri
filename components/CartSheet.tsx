import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, HandCoins } from "lucide-react";
import Image from "next/image";
import Spinner from "../components/ui/spinner";

const CartSheet = ({
  open,
  onOpenChange,
  cartItems,
  handleRemoveItem,
  onOpenDonationDialog,
}) => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const hasRealItems = Array.isArray(cartItems) && cartItems.length > 0;

  const dummyItems = [
    {
      id: "dummy-1",
      amount: 100,
      currency: "USD",
      campaign: {
        title: "حملة تبرع تجريبية",
        images: ["https://i.ibb.co/wrZgRSKL/478111320-933834268919748-6538127445337810245-n.jpg"],
      },
    },
    {
      id: "dummy-2",
      amount: 250,
      currency: "USD",
      campaign: {
        title: "حملة دعم افتراضية",
        images: ["https://i.ibb.co/tpYQTRzB/479194011-933837085586133-2299572547794342719-n.jpg"],
      },
    },
  ];

  const displayItems = hasRealItems ? cartItems : dummyItems;

  const handleDelete = async (id: string) => {
    if (!hasRealItems) return; // disable delete for dummy items
    setLoadingItemId(id);
    await handleRemoveItem(id);
    setLoadingItemId(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-96">
        <SheetHeader>
          <SheetTitle className="text-blue-700">
            سلة تبرعاتي
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4  rounded-lg"
            >
              <Image
                src={item.campaign.images[0]}
                alt={item.campaign.title}
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg object-cover"
              />

              <div className="flex-1">
                <h3 className="font-medium text-sm pb-1">
                  {item.campaign.title}
                </h3>
                <p className="text-sm text-gray-500">
                  المبلغ:{" "}
                  <span className="font-semibold text-blue-600">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: item.currency,
                    }).format(item.amount)}
                  </span>
                </p>
              </div>

              {loadingItemId === item.id ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:bg-red-50"
                  disabled={!hasRealItems}
                  onClick={() => handleDelete(item.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <SheetFooter className="mt-6">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-600 text-white gap-2"
            onClick={() => {
              onOpenChange(false);
              onOpenDonationDialog();
            }}
          >
            <HandCoins className="h-5 w-5" />
            تبرع الآن
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
