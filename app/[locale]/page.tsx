"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Heart,
  Utensils,
  Hospital,
  Users,
  Globe,
  HandCoins,
  ForkKnife,
  Moon,
  UserPlus,
  CheckCircle,
  Lightbulb,
  Wallet,
} from "lucide-react";
import CampaignsSlider from "./_components/homepage/CampaignsSlider";
import CampaignsDisplay from "./_components/homepage/CampaignsDisplay";
import CampaignCard from "./_components/CampaignCard";
import QuickDonate from "./_components/homepage/QuickDonate";
import HeroSlider from "./_components/homepage/HeroSlider";
import axios from "axios";
import router from "next/router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import BlogCard from "./_components/BlogCard";
import LiveDonationsTicker from "@/components/LiveDonationsTicker";

// Gerçek projelere ve görsellere göre güncellenmiş veriler
const heroSlides = [
  {
    title: "كُدْسْتَكِي بِرْ چُوْجُوغَا دَسْتَكْ أُولْ",
    subtitle: "فَلِسْطِينَ لِلْأَطْفَالِ الْمَظْلُومِينَ",
    buttonText: "الآن تَبَرَّعْ",
    image: "/hero3.jpg",
  },
  {
    title: "أَطْفَالُنَا الْيَتَامَى فِي كُلِّ الْعَالَمِ",
    subtitle: "مَعَكُمْ نُبْنِي مُسْتَقْبَلًا أَفْضَلَ",
    buttonText: "تَبَرَّعْ الْآنَ",
    image: "/hero2.jpg",
  },
];

const campaigns = [
  {
    id: "1",
    images: [
      "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=600&h=400&fit=crop",
    ],
    title: "مَشْرُوعُ حِفْظِ الْقُرْآنِ الْكَرِيمِ",
    description: "دعم حفظة القرآن الكريم",
    category: "تعليم",
    currentAmount: 15750,
    targetAmount: 50000,
    contributors: 127,
    daysLeft: 15,
  },
  {
    id: "2",
    images: [
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop",
    ],
    title: "أَطْفَالٌ سُعَدَاء وَجُوهٌ مُبْتَسِمَة",
    description: "إسعاد الأطفال الأيتام",
    category: "رعاية اجتماعية",
    currentAmount: 8200,
    targetAmount: 25000,
    contributors: 89,
    daysLeft: 22,
  },
  {
    id: "3",
    images: [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop",
    ],
    title: "مَشْرُوعُ دَعْمِ التَّعْلِيمِ",
    description: "توفير التعليم للمحتاجين",
    category: "تعليم",
    currentAmount: 32500,
    targetAmount: 40000,
    contributors: 203,
    daysLeft: 8,
  },
  {
    id: "4",
    images: [
      "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&h=400&fit=crop",
    ],
    title: "إفطار صائم في رمضان",
    description: "توفير وجبات إفطار للصائمين",
    category: "إغاثة",
    currentAmount: 45000,
    targetAmount: 60000,
    contributors: 312,
    daysLeft: 12,
  },
  {
    id: "5",
    images: [
      "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop",
    ],
    title: "كفالة يتيم",
    description: "كفالة الأيتام ورعايتهم",
    category: "رعاية اجتماعية",
    currentAmount: 18900,
    targetAmount: 36000,
    contributors: 156,
    daysLeft: 30,
  },
  {
    id: "6",
    images: [
      "https://images.unsplash.com/photo-1578496479530-be46d80fc43a?w=600&h=400&fit=crop",
    ],
    title: "بناء مسجد",
    description: "المساهمة في بناء مسجد للقرية",
    category: "مشاريع خيرية",
    currentAmount: 125000,
    targetAmount: 200000,
    contributors: 445,
    daysLeft: 45,
  },
  {
    id: "7",
    images: [
      "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=600&h=400&fit=crop",
    ],
    title: "علاج المرضى المحتاجين",
    description: "توفير العلاج الطبي للفقراء",
    category: "صحة",
    currentAmount: 67500,
    targetAmount: 100000,
    contributors: 289,
    daysLeft: 18,
  },
  {
    id: "8",
    images: [
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&h=400&fit=crop",
    ],
    title: "حفر بئر ماء",
    description: "توفير مياه نظيفة للقرى النائية",
    category: "مشاريع خيرية",
    currentAmount: 28000,
    targetAmount: 50000,
    contributors: 178,
    daysLeft: 25,
  },
];

const targetedDonations = [
  { title: "مَشْرُوعُ إِنْقَاذِ فَلِسْطِينَ", image: "/target1.jpg" },
  { title: "مَشْرُوعُ تَدْفِئَةِ كُلِّ طِفْلٍ", image: "/target2.jpg" },
  { title: "مَشْرُوعُ دَعْمِ التَّعْلِيمِ", image: "/target3.jpg" },
];

const news = [
  {
    title:
      "لقد كان شرفًا لنا حضور مؤتمر أولئك الذين يتخذون إجراءات من أجل الإنسانية",
    image:
      "https://gozbebekleri.org/uploads/insanligin-etkileyicileri-konferansi_2084.jpg",
  },
  {
    title: "دعمنا للمتضررين من الزلزال في شمال سوريا",
    image:
      "https://gozbebekleri.org/uploads/suriyenin-kuzeyindeki-depremden-etkilenenlere-destegimiz_2081.jpg",
  },
  {
    title: "حملة بسمة هلال الرمضانية",
    image:
      "https://gozbebekleri.org/uploads/4FLefMYaeSyqaKK2N1Hb_1744967602314.jpg",
  },
];

const HomePage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const fetchPostData = async () => {
    try {
      const response = await axios.get(`https://minberiaksa.org/admasfasfafin`);
      console.log(response.data);
    } catch (error) {
      router.push("/404");
    }
  };

  useEffect(() => {
    fetchPostData();
  }, []);

  return (
    <div className="bg-white mx-auto">
      {/* Hero Carousel */}
      {/* <section className="relative h-[300px] sm:h-[400px] lg:h-[500px] mx-2 sm:mx-4 overflow-hidden mt-16 sm:mt-20 lg:mt-24 rounded-2xl sm:rounded-3xl shadow-xl">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <Image src={slide.image} alt="Hero" fill className="object-cover" priority={index === 0} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            <div className="absolute bottom-8 sm:bottom-12 lg:bottom-20 right-4 sm:right-6 lg:right-10 text-white max-w-xs sm:max-w-md lg:max-w-2xl">
              <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold mb-2 sm:mb-3 lg:mb-4">{slide.title}</h1>
              <p className="text-sm sm:text-lg lg:text-xl mb-4 sm:mb-6 lg:mb-8">{slide.subtitle}</p>
              <button className="bg-orange-600 text-white px-5 py-2 sm:px-7 sm:py-3 lg:px-10 lg:py-4 rounded-full font-bold text-sm sm:text-base lg:text-lg hover:bg-orange-700 transition">
                {slide.buttonText}
              </button>
            </div>
          </div>
        ))}

        <div className="absolute bottom-3 sm:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 rounded-full ${i === currentSlide ? 'bg-orange-600' : 'bg-white/60'}`}
            />
          ))}
        </div>
      </section> */}
      <HeroSlider />

      {/* Current Projects */}
      <section className="container mx-auto mt-2">
        <CampaignsSlider isGrid={true} isGridMobile={false} limit={8} />
      </section>

      {/* Donation Categories */}
      <section
        className="bg-white py-6 sm:py-10"
        style={{
          backgroundImage: `url('/wavey-fingerprint.svg')`,
          backgroundRepeat: "repeat",
        }}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-2xl lg:text-3xl font-semibold sm:font-bold text-center mb-6 text-gray-800">
            مجالات التبرع
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 text-center">
            {[
              { icon: Moon, label: "أُمَّةٌ" },
              { icon: Heart, label: "مَلَابِس" },
              { icon: Hospital, label: "صِحَّة" },
              { icon: Utensils, label: "غِذَاء" },
              { icon: HandCoins, label: "زَكَاة" },
              { icon: ForkKnife, label: "أَضَاحِي" },
            ].map((cat, i) => (
              <a key={i} href="#" className="hover:text-orange-600 transition">
                <cat.icon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-orange-600" />
                <span className="font-medium text-xs sm:text-sm">
                  {cat.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* About + Quick Donate */}
      <div>
        <QuickDonate />
      </div>

      <section className="container mx-auto px-4 py-8 sm:py-10 lg:py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-gray-800">
          أخبارنا
        </h2>
        <p className="text-center text-gray-700 mb-6 text-xs sm:text-sm">
          اخر أخبار جمعيتنا
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {news.map((item) => (
            <div key={item.title}>
              <BlogCard title={item.title} image={item.image} link='#' />
              </div>
          ))}
        </div>
      </section>

      {/* Q&A */}
      <div className="bg-white pb-8 sm:pb-10 lg:pb-12 max-w-7xl mx-auto px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* قسم الأسئلة الشائعة */}
            <div>
              <h2 className="text-2xl md:text-4xl max-sm:text-center font-bold mb-6 text-gray-800">
                الأسئلة الشائعة
              </h2>
              <Accordion type="single" collapsible>
                {[
                  {
                    question: "كيف يمكنني الانضمام كمتطوع؟",
                    answer:
                      "يمكنك التسجيل من خلال موقعنا عبر ملء نموذج الانضمام، وستتلقى رسالة تحتوي على الخطوات التالية مثل الاختبارات والتوجيه الأولي.",
                    icon: <UserPlus className="w-6 h-6 mx-3 text-blue-500" />,
                  },
                  {
                    question: "هل التطوع في فريق العافية مدفوع؟",
                    answer:
                      "لا، التطوع مجاني بالكامل، ولكن في بعض البرامج يتم توفير بدل انتقالات أو مكافآت تقديرية للمتطوعين النشطين.",
                    icon: <Wallet className="w-6 h-6 mx-3 text-green-500" />,
                  },
                  {
                    question: "كيف يتم اختيار المتطوعين للمشاريع؟",
                    answer:
                      "يعتمد الاختيار على عدة عوامل مثل التخصص، الموقع الجغرافي، والتوافر، حيث نحاول توجيه كل متطوع إلى الفرصة الأنسب له.",
                    icon: (
                      <CheckCircle className="w-6 h-6 mx-3 text-purple-500" />
                    ),
                  },
                  {
                    question: "هل أستطيع التطوع عن بعد؟",
                    answer:
                      "نعم! لدينا فرص تطوع رقمية تشمل إدارة المحتوى، تصميم الجرافيك، التسويق الإلكتروني، والتواصل مع الجهات الداعمة.",
                    icon: <Globe className="w-6 h-6 mx-3 text-orange-500" />,
                  },
                  {
                    question: "كيف يمكنني اقتراح مبادرة خاصة بي؟",
                    answer:
                      "إذا كانت لديك فكرة مشروع إنساني، يمكن لفريق العافية مساعدتك في تنفيذها عبر توفير الموارد والدعم اللوجستي.",
                    icon: (
                      <Lightbulb className="w-6 h-6 mx-3 text-yellow-500" />
                    ),
                  },
                ].map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border-b"
                  >
                    <AccordionTrigger className="text-sm text-right hover:text-blue-600 transition">
                      <div className="flex items-center">
                        {faq.icon}
                        {faq.question}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* قسم الصورة */}
            <div>
              <img
                src="https://i.ibb.co/Q7zfYF8J/558969696-1112724364364070-4681565038920366683-n.jpg"
                alt="تأثير المجتمع"
                className="max-sm:hidden rounded-2xl shadow-2xl transform transition duration-300 w-full"
              />
            </div>
          </div>
        </div>
      </div>
      <LiveDonationsTicker />
    </div>
  );
};

export default HomePage;
