'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HandHeart, Share2, ArrowRight, Receipt, Calendar, CreditCard, PartyPopper, HandHeartIcon, Gift, Heart, Sparkles, ThumbsUp, ArrowLeft } from 'lucide-react';
import { useConfettiStore } from "@/hooks/use-confetti-store";
import axios from 'axios';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
    params: {
      id: string;
    };
  }

const DonationSuccessPage = ({ params }: Props) => {
  const router = useRouter();
  const confetti = useConfettiStore();
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonation();
    confetti.onOpen();
  }, []);

  const fetchDonation = async () => {
    try {
      const response = await axios.get(`/api/donations/${params.id}`);
      setDonation(response.data);
    } catch (error) {
      console.error('Error fetching donation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-emerald-50 via-white to-emerald-50" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-12 relative"
        >
          {/* Decorative elements */}
          <motion.div 
            className="absolute -top-4 left-1/4 text-emerald-500 opacity-50"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-8 h-8" />
          </motion.div>
          <motion.div 
            className="absolute top-12 right-1/4 text-emerald-400 opacity-50"
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          >
            <PartyPopper className="w-10 h-10" />
          </motion.div>

          <div className="inline-block p-6 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-full mb-8">
            <HandHeartIcon className="w-20 h-20 text-emerald-600" />
          </div>
          
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
            شكراً {donation.donor.name} 🎉
            </h1>
            <p className="text-xl text-gray-600 mb-4">
            تبرعك تم تسليمه بنجاح! لقد ساهمت في إحداث فرق حقيقي في حياة انسان.
            </p>
          </motion.div>

          <div className="text-center mb-12">
            <p className="text-xl text-gray-600 mb-2">
              رقم العملية: {donation.id}
            </p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-xl bg-white h-full">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-emerald-50 p-3 rounded-full">
                    <Receipt className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">تفاصيل التبرع</h3>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <p>{format(new Date(donation.createdAt), 'dd MMMM yyyy', { locale: ar })}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 mb-1">المبلغ الإجمالي</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {donation.totalAmount.toLocaleString()} {donation.currency}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="text-gray-600">المبلغ الأساسي: {donation.amount.toLocaleString()} {donation.currency}</p>
                      {donation.teamSupport > 0 && (
                        <p className="text-gray-600">دعم الفريق: {donation.teamSupport.toLocaleString()} {donation.currency}</p>
                      )}
                      {donation.coverFees && (
                        <p className="text-gray-600">رسوم المعاملة: {donation.fees.toLocaleString()} {donation.currency}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-xl bg-white h-full">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">الحملات التي تم التبرع لها</h3>
                <div className="space-y-4">
                  {donation.items.map((item: any) => (
                    <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <Image
                          src={item.campaign.images[0]}
                          alt={item.campaign.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{item.campaign.title}</h4>
                        <p className="text-emerald-600 font-medium mt-1">
                          {item.amount.toLocaleString()} {donation.currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => router.push('/campaigns')}
            className="flex gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:opacity-90 text-white font-semibold py-6 px-8 text-base rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Heart className="w-5 h-5" />
            تصفح الحملات
          </Button>
          <Button
            onClick={() => router.push('/')}
            className="flex gap-2 bg-gradient-to-r from-gray-900 to-gray-800 hover:opacity-90 text-white font-semibold py-6 px-8 text-base rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
          >
            العودة للرئيسية
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </main>
  );
};

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-4" dir="rtl">
    <div className="max-w-6xl mx-auto py-12">
      {/* Header Skeleton */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <Skeleton className="w-24 h-24 rounded-full" />
        </div>
        <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
        <Skeleton className="h-6 w-1/2 mx-auto mb-2" />
        <Skeleton className="h-6 w-1/4 mx-auto" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Donation Details Card Skeleton */}
        <div className="bg-white rounded-xl p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>

        {/* Campaigns Card Skeleton */}
        <div className="bg-white rounded-xl p-8 shadow-xl">
          <Skeleton className="h-8 w-1/2 mb-6" />
          <div className="space-y-4">
            {[1, 2].map((item) => (
              <div key={item} className="flex gap-4">
                <Skeleton className="w-20 h-20 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Buttons Skeleton */}
      <div className="flex justify-center gap-4">
        <Skeleton className="h-14 w-40 rounded-xl" />
        <Skeleton className="h-14 w-40 rounded-xl" />
      </div>
    </div>
  </div>
);

export default DonationSuccessPage;