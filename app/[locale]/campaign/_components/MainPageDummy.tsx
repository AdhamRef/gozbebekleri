"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Edit2,
  Trash2,
  Send,
  Loader2,
  MoreHorizontal,
  Play,
  Twitter,
  Facebook,
  Newspaper,
  SmilePlus,
  FileText,
  Bell,
  Info,
  Heart,
  Share2,
  Users,
  Book,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import DonationSidebar from "./DonationSidebar";

// Types
interface Category {
  name: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  images: string[];
  targetAmount: number;
  currentAmount: number;
  donationCount: number;
  progress: number;
  category: Category;
  donationStats: {
    first: DonationStat | null;
    largest: DonationStat | null;
    last: DonationStat | null;
  };
  updates: Array<{
    id: string;
    title: string;
    description: string;
    image: string | null;
    createdAt: string;
  }>;
}

interface DonationStat {
  amount: number;
  donor: string;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: {
    name: string;
    image: string;
  };
}

export const dummyCampaign = {
  id: "camp_123456",
  title: "مساعدة عائلة أبو أحمد لبناء منزل جديد",
  description:
    "السلام عليكم ورحمة الله وبركاته، نحن نجمع التبرعات لمساعدة عائلة أبو أحمد المكونة من 7 أفراد لبناء منزل جديد بعد أن تهدم منزلهم القديم بسبب الأمطار الغزيرة الشتاء الماضي. العائلة تعيش حالياً في منزل مستأجر صغير لا يكفي احتياجاتهم، والأب يعمل بجد كعامل بناء لكن دخله لا يكفي لتوفير تكاليف البناء. نحتاج لبناء منزل مكون من 3 غرف ومطبخ وحمامين على مساحة 150 متر مربع. المبلغ المطلوب يشمل تكاليف مواد البناء والعمالة والتشطيبات الأساسية. كل مساهمة مهما كانت صغيرة ستساعد هذه العائلة على العيش بكرامة تحت سقف منزلهم الخاص. جزاكم الله خيراً على كل مساعدة.",
  images: [
    "https://i.ibb.co/tpYQTRzB/479194011-933837085586133-2299572547794342719-n.jpg",
    "https://i.ibb.co/wrZgRSKL/478111320-933834268919748-6538127445337810245-n.jpg",
    "https://i.ibb.co/qMhq4fYJ/504276037-1017141940588980-6088827847565700606-n.jpg",
  ],
  targetAmount: 150000,
  currentAmount: 87500,
  donationCount: 234,
  progress: 58.3,
  category: {
    name: "إسكان",
  },
  donationStats: {
    first: {
      amount: 500,
      donor: "محمد العلي",
    },
    largest: {
      amount: 10000,
      donor: "متبرع كريم",
    },
    last: {
      amount: 1000,
      donor: "فاطمة أحمد",
    },
  },
  updates: [
    {
      id: "update_1",
      title: "بدء أعمال صب الأساسات",
      description:
        "الحمد لله، بفضل تبرعاتكم الكريمة تمكنا من البدء بأعمال صب الأساسات للمنزل. فريق العمل بدأ العمل منذ أسبوع والعمل يسير بشكل ممتاز. أبو أحمد وعائلته سعداء جداً ويدعون لكم جميعاً بالخير والبركة. نحتاج لمزيد من الدعم لإتمام المرحلة القادمة وهي بناء الجدران. بارك الله فيكم وجزاكم عنا خير الجزاء.",
      image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800",
      createdAt: "2024-01-18T09:30:00Z",
    },
    {
      id: "update_2",
      title: "وصلنا لنصف المبلغ المطلوب!",
      description:
        "بشرى سارة! وصلنا إلى 50% من المبلغ المستهدف بفضل كرمكم وتبرعاتكم السخية. أكثر من 200 متبرع ساهموا حتى الآن، وهذا شيء رائع يدل على تكاتف المجتمع. عائلة أبو أحمد لا تجد الكلمات للتعبير عن امتنانها وشكرها لكم. نرجو منكم الاستمرار في الدعم ومشاركة الحملة مع أصدقائكم وعائلاتكم. كل ريال يُحدث فرقاً كبيراً.",
      image: null,
      createdAt: "2024-01-12T15:20:00Z",
    },
    {
      id: "update_3",
      title: "شراء الأرض وتجهيزها",
      description:
        "السلام عليكم، نحمد الله على نجاح الحملة في بدايتها. تمكنا من شراء قطعة الأرض المناسبة في حي هادئ وآمن بمساحة 200 متر مربع. تم تنظيف الأرض وتسويتها وحصلنا على تصريح البناء من البلدية. المرحلة القادمة ستكون البدء في حفر الأساسات. شكراً لكل من ساهم ودعم، ونسأل الله أن يجعله في ميزان حسناتكم.",
      image:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
      createdAt: "2024-01-05T10:15:00Z",
    },
    {
      id: "update_4",
      title: "إطلاق الحملة - نداء للمساعدة",
      description:
        "بسم الله الرحمن الرحيم، نطلق اليوم حملة لمساعدة عائلة أبو أحمد الكريمة. هذه عائلة محتاجة ومستحقة للمساعدة، وقد تحققنا من وضعهم بأنفسنا. الأب رجل صالح يعمل بجد لتأمين لقمة العيش لأطفاله، لكنه لا يستطيع توفير تكاليف بناء منزل بمفرده. ندعوكم للمشاركة في هذا العمل الخيري ومد يد العون لهذه العائلة. اللهم اجعلها صدقة جارية لكل من ساهم.",
      image: null,
      createdAt: "2024-01-01T08:00:00Z",
    },
  ],
};

export const dummyComments = [
  {
    id: "comment_1",
    text: "ما شاء الله، مبادرة رائعة. تبرعت بمبلغ بسيط وأدعو الله أن يبارك في هذا العمل. نسأل الله أن يوفقكم ويعينكم على إتمام المشروع. 🤲",
    createdAt: "2024-01-19T11:30:00Z",
    user: {
      name: "عبدالله السالم",
      image: "https://i.pravatar.cc/150?img=11",
    },
  },
  {
    id: "comment_2",
    text: "بارك الله فيكم على هذا العمل الطيب. ساهمت بما استطعت وأسأل الله أن يجعله في ميزان حسناتنا جميعاً. جزاكم الله خيراً 💚",
    createdAt: "2024-01-18T16:45:00Z",
    user: {
      name: "نورة المطيري",
      image: "https://i.pravatar.cc/150?img=12",
    },
  },
  {
    id: "comment_3",
    text: "اللهم بارك، شاركت الحملة مع كل أصدقائي وعائلتي. نسأل الله أن يعين عائلة أبو أحمد ويفرج كربهم. إن شاء الله نرى المنزل مكتمل قريباً 🏠",
    createdAt: "2024-01-17T09:20:00Z",
    user: {
      name: "خالد الأحمد",
      image: "https://i.pravatar.cc/150?img=13",
    },
  },
  {
    id: "comment_4",
    text: "تبرعت والحمد لله. هل يمكن زيارة الموقع لمن يرغب في التطوع بالمساعدة في البناء؟ أنا جاهز للمساعدة في أيام العطلة.",
    createdAt: "2024-01-16T14:10:00Z",
    user: {
      name: "سعد الغامدي",
      image: "https://i.pravatar.cc/150?img=14",
    },
  },
  {
    id: "comment_5",
    text: "جزاكم الله خيراً على الأخبار المستمرة. نشعر بالاطمئنان عندما نرى تقدم العمل. ربي يوفقكم ويسهل أموركم جميعاً 🌟",
    createdAt: "2024-01-15T19:30:00Z",
    user: {
      name: "مريم العتيبي",
      image: "https://i.pravatar.cc/150?img=15",
    },
  },
  {
    id: "comment_6",
    text: "الله يجزيكم خير. حملة مميزة وواضحة. تبرعت اليوم وإن شاء الله نتبرع مرة ثانية الشهر القادم بإذن الله.",
    createdAt: "2024-01-14T12:45:00Z",
    user: {
      name: "أحمد الشمري",
      image: "https://i.pravatar.cc/150?img=16",
    },
  },
  {
    id: "comment_7",
    text: "ربنا يبارك فيكم ويجعله في ميزان حسناتكم. شيء جميل أن نرى الناس تساعد بعضها. الله يعطيكم العافية على الجهود المبذولة 🙏",
    createdAt: "2024-01-13T08:15:00Z",
    user: {
      name: "ليلى الحربي",
      image: "https://i.pravatar.cc/150?img=17",
    },
  },
  {
    id: "comment_8",
    text: "ما شاء الله تبارك الله، الحمد لله على التقدم الممتاز. نسأل الله أن يتم المشروع على خير ويرزقكم الأجر والثواب.",
    createdAt: "2024-01-11T17:20:00Z",
    user: {
      name: "يوسف القحطاني",
      image: "https://i.pravatar.cc/150?img=18",
    },
  },
];

// Main Component
const ImprovedCampaignPage = ({ id }: { id: string }) => {
  const [campaign] = useState<Campaign>(dummyCampaign);
  const [comments, setComments] = useState<Comment[]>(dummyComments);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<
    "description" | "updates" | "comments" | "info"
  >("description");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const tabs = [
    { id: "description", label: "القصة", icon: Book },
    {
      id: "updates",
      label: "التحديثات",
      icon: Bell,
      badge: campaign.updates.length,
    },
    {
      id: "comments",
      label: "التعليقات",
      icon: MessageCircle,
      badge: comments.length,
    },
    { id: "info", label: "معلومات", icon: Info },
  ];

  return (
    <main className="min-h-screen bg-gray-100 sm:pt-20 pt-14 pb-6">
      <div className="max-w-7xl mx-auto sm:px-4 py-6 sm:py-8 ">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 mb-8">

          {/* Left Side - Images and Content */}
          <div className="lg:col-span-8 sm:bg-white sm:border sm:rounded-lg overflow-hidden">


{/* Mobile Hero Image */}
<div className="relative -mx-3 sm:mx-0 sm:hidden">
  <div className="relative h-[65vh] w-full overflow-hidden">
    <img
      src={campaign.images[selectedImage]}
      alt={campaign.title}
      className="absolute inset-0 w-full h-full object-cover"
    />

    {/* Black Fade */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

    {/* Text Overlay */}
    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
      <span className="inline-block mb-2 bg-white/20 backdrop-blur text-xs font-bold px-3 py-1 rounded-full">
        {campaign.category.name}
      </span>

      <h1 className="text-2xl font-extrabold leading-snug">
        {campaign.title}
      </h1>
    </div>
  </div>
</div>

{/* Desktop Image (unchanged behavior) */}
<motion.div
  initial={{ opacity: 0, scale: 0.98 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: 0.15 }}
  className="relative rounded-lg overflow-hidden shadow-lg mb-4 group hidden sm:block"
>
  <img
    src={campaign.images[selectedImage]}
    alt={campaign.title}
    className="w-full h-[360px] lg:h-[420px] object-cover"
  />

  {/* Soft gradient */}
  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

  {/* Desktop overlay content */}
  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
    <span className="inline-block mb-2 bg-white/20 backdrop-blur text-xs font-bold px-3 py-1 rounded-full">
      {campaign.category.name}
    </span>

    <h1 className="text-2xl lg:text-3xl font-extrabold leading-tight max-w-[90%]">
      {campaign.title}
    </h1>
  </div>
</motion.div>

            {/* Image Thumbnails */}
            <div className="mt-4 sm:mx-4">

            {campaign.images.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-visible pb-2">
                {campaign.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                      selectedImage === index
                        ? "ring-2 ring-blue-500"
                        : "ring-2 ring-gray-200 hover:ring-blue-300"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`صورة ${index + 1}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            </div>

            {/* Tabs */}
<div className="bg-white max-sm:border sm:border-y max-sm:rounded-lg shadow-md mb-6 -mt-8 relative top-8 z-30">
  <div className="grid grid-cols-4 border-b border-gray-200">
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;

      return (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`
            flex flex-col sm:flex-row
            items-center justify-center
            gap-1 sm:gap-1.5
            px-1 sm:px-3
            py-3
            min-w-0
            text-[10.5px] sm:text-sm
            font-semibold
            leading-tight
            transition-all
            relative
            rounded-t-2xl
            ${
              isActive
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }
          `}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />

          <span className="truncate max-w-full text-center">
            {tab.label}
          </span>

          {tab.badge && (
            <span
              className="
                absolute top-1 right-1
                sm:static sm:ml-1
                bg-blue-100 text-blue-700
                text-[9px] sm:text-xs
                font-bold
                px-1 py-0.5
                rounded-full
                leading-none
              "
            >
              {tab.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-5">
                <AnimatePresence mode="wait">
                  {activeTab === "description" && (
                    <motion.div
                      key="description"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                        {campaign.description}
                      </p>
                    </motion.div>
                  )}

                  {activeTab === "updates" && (
                    <motion.div
                      key="updates"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {campaign.updates.map((update, index) => (
                        <motion.div
                          key={update.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border-b border-gray-200 pb-4 last:border-0"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Bell className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900 mb-1.5">
                                {update.title}
                              </h3>
                              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(update.createdAt).toLocaleDateString(
                                  "ar-SA",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                              <p className="text-gray-700 text-sm leading-relaxed mb-3">
                                {update.description}
                              </p>
                              {update.image && (
                                <img
                                  src={update.image}
                                  alt={update.title}
                                  className="rounded-lg shadow-md max-w-full h-auto"
                                />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}

                  {activeTab === "comments" && (
                    <motion.div
                      key="comments"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Add Comment Form */}
                      <div className="mb-5">
                        <div className="flex gap-2.5 bg-gray-50 rounded-lg p-3 border border-gray-200 focus-within:border-blue-500 transition-all">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                              أ
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="شارك رأيك أو كلمة تشجيع..."
                              className="w-full resize-none border-none focus:ring-0 text-sm bg-transparent"
                              rows={2}
                            />
                            <div className="flex justify-end mt-1.5">
                              <Button
                                disabled={!newComment.trim() || isSubmitting}
                                className="bg-blue-600 hover:bg-blue-700 text-sm h-8 text-white"
                              >
                                {isSubmitting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                إرسال
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-4">
                        {comments.map((comment, index) => (
                          <motion.div
                            key={comment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Avatar className="w-9 h-9 flex-shrink-0">
                              <AvatarImage src={comment.user.image} />
                              <AvatarFallback className="text-sm">
                                {comment.user.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {comment.user.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    comment.createdAt
                                  ).toLocaleDateString("ar-SA")}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {comment.text}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "info" && (
                    <motion.div
                      key="info"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">
                          إحصائيات الحملة
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-blue-600 mb-0.5">
                              {campaign.donationCount}
                            </div>
                            <div className="text-xs text-gray-600">متبرع</div>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-2xl font-bold text-blue-600 mb-0.5">
                              {campaign.progress.toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-600">مكتمل</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Desktop */}
          <div className="lg:col-span-4 max-sm:hidden">
            <div className="sticky top-24">
              <DonationSidebar campaign={campaign} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="sm:hidden">
        <DonationSidebar campaign={campaign} isMobileSticky />
      </div>
    </main>
  );
};

export default ImprovedCampaignPage;
