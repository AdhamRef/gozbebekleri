'use client';
import React from 'react';
import { Target, Users, Heart, MessageSquare, CheckCircle, Eye, Sparkles } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const AboutUs = () => {
  const t = useTranslations('AboutUs');
  const locale = useLocale() as 'ar' | 'en' | 'fr';

  // Helper function to get locale-specific property
  const getLocalizedProperty = (obj: any, key: string) => {
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    return obj[localeKey] || obj[key] || '';
  };

  const goals = [
    {
      textAr: "تقديم أفضل الخدمات المعيشية والصحية والنفسية والتعليمية للاطفال وذويهم",
      textEn: "Providing the best living, health, psychological, and educational services for children and their families",
      textFr: "Fournir les meilleurs services de vie, de santé, psychologiques et éducatifs aux enfants et à leurs familles"
    },
    {
      textAr: "إعداد جيل يتفوق على ذاته ويتخطى الصعاب التي تواجهه",
      textEn: "Preparing a generation that excels beyond itself and overcomes the challenges it faces",
      textFr: "Préparer une génération qui excelle au-delà d'elle-même et surmonte les défis auxquels elle est confrontée"
    },
    {
      textAr: "اكتشاف المهارات وتنمية الابداع وبناء قدرات الأطفال",
      textEn: "Discovering skills, developing creativity, and building children's capabilities",
      textFr: "Découvrir les compétences, développer la créativité et construire les capacités des enfants"
    },
    {
      textAr: "حماية الأطفال من الإستغلال بكافة أشكاله وتنمية الوعي لديهم",
      textEn: "Protecting children from all forms of exploitation and developing their awareness",
      textFr: "Protéger les enfants de toutes les formes d'exploitation et développer leur sensibilisation"
    },
    {
      textAr: "تنشئة أجيال تتمتع بقيم وأخلاق سليمة",
      textEn: "Raising generations with sound values and ethics",
      textFr: "Élever des générations avec des valeurs et une éthique saines"
    },
    {
      textAr: "إنشاء منظومة تربوية وتعليمية وصحية حديثة",
      textEn: "Creating a modern educational, learning, and health system",
      textFr: "Créer un système éducatif, d'apprentissage et de santé moderne"
    },
    {
      textAr: "نرتقي بالأطفال نحو مستقبل مشرق",
      textEn: "Elevating children towards a bright future",
      textFr: "Élever les enfants vers un avenir radieux"
    }
  ];

  const presidentMessage = [
    {
      textAr: "في عالمنا اليوم، وخاصة في الجغرافيا الإسلامية، فإن الذين يعانون أكثر من غيرهم من المشاكل مثل الأزمات السياسية، والأزمات الاقتصادية، والكوارث الطبيعية، هم بلا شك أبناؤنا.",
      textEn: "In our world today, especially in the Islamic geography, those who suffer most from problems such as political crises, economic crises, and natural disasters are undoubtedly our children.",
      textFr: "Dans notre monde d'aujourd'hui, en particulier dans la géographie islamique, ceux qui souffrent le plus des problèmes tels que les crises politiques, les crises économiques et les catastrophes naturelles sont sans aucun doute nos enfants."
    },
    {
      textAr: "ولكي لا نبقى مجرد متفرجين على هذه الأوضاع، فقد تحركنا من أجل جعل المستقبل أكثر ملاءمة لجميع الأطفال الذين نستطيع الوصول إليهم، وخاصة الأيتام.",
      textEn: "In order not to remain mere spectators of these situations, we have moved to make the future more suitable for all children we can reach, especially orphans.",
      textFr: "Afin de ne pas rester de simples spectateurs de ces situations, nous avons agi pour rendre l'avenir plus adapté à tous les enfants que nous pouvons atteindre, en particulier les orphelins."
    },
    {
      textAr: "نحن في جمعية جوزبيبيكلي نعمل على دعم أطفالنا والأيتام من خلال مشاريع مختلفة تشمل عائلاتهم وخاصة في مجالات الصحة والتعليم والتغذية منذ عام 2011.",
      textEn: "At the Gozbebekleri Association, we have been working to support our children and orphans through various projects that include their families, especially in the fields of health, education, and nutrition since 2011.",
      textFr: "À l'Association Gozbebekleri, nous travaillons depuis 2011 à soutenir nos enfants et orphelins grâce à divers projets qui incluent leurs familles, en particulier dans les domaines de la santé, de l'éducation et de la nutrition."
    },
    {
      textAr: "وعندما يتعلق الأمر بأبنائنا فإن قائدنا هو نبينا العظيم صلى الله عليه وسلم. نحاول أن نتخذ هذه الحساسية عند نبينا قدوة، ونحاول أن نخفف من هموم أبنائنا أينما كانوا.",
      textEn: "When it comes to our children, our leader is our great Prophet (peace be upon him). We try to take this sensitivity of our Prophet as an example, and we try to alleviate the concerns of our children wherever they are.",
      textFr: "Quand il s'agit de nos enfants, notre leader est notre grand Prophète (paix soit sur lui). Nous essayons de prendre cette sensibilité de notre Prophète comme exemple, et nous essayons d'alléger les préoccupations de nos enfants où qu'ils soient."
    },
    {
      textAr: "نعمل على دعم وملامسة حياة مئات الآلاف من الأطفال من خلال تذكيرهم بأنهم ليسوا عاجزين، بالتعاون مع موظفينا المدربين ومتطوعينا في مختلف بلدان العالم.",
      textEn: "We work to support and touch the lives of hundreds of thousands of children by reminding them that they are not helpless, in cooperation with our trained staff and volunteers in various countries around the world.",
      textFr: "Nous travaillons à soutenir et à toucher la vie de centaines de milliers d'enfants en leur rappelant qu'ils ne sont pas impuissants, en coopération avec notre personnel formé et nos bénévoles dans divers pays du monde."
    },
    {
      textAr: "وستواصل جمعيتنا العمل معكم بأصدق المشاعر، بعيداً عن أي هدف ربحي، انطلاقاً من مبدأ \"خدمة الشعب هي خدمة لله\".",
      textEn: "Our association will continue to work with you with the most sincere feelings, away from any profit motive, based on the principle \"Serving the people is serving God\".",
      textFr: "Notre association continuera à travailler avec vous avec les sentiments les plus sincères, loin de tout motif de profit, sur la base du principe \"Servir le peuple, c'est servir Dieu\"."
    }
  ];

  return (
    <div className="bg-white">
      {/* Compact Hero */}
      <section className="relative h-[250px] sm:h-[320px] overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&h=400&fit=crop" 
            alt="أطفال سعداء"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/60"></div>
        </div>
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center text-white px-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">{t('pageTitle')}</h1>
          <p className="text-sm sm:text-base lg:text-lg text-sky-200">
            {t('associationName')}
          </p>
        </div>
      </section>

      {/* Section 1: About - Compact */}
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-600 px-3 py-1.5 rounded-full text-xs font-semibold mb-4">
                <Heart className="w-3.5 h-3.5" />
                <span>{t('associationName')}</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-4">
                {t('aboutUsTitle')}
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-3 text-sm sm:text-base">
                <p>
                  {t('aboutUsDesc1')}
                </p>
                <p>
                  {t('aboutUsDesc2')}
                </p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative rounded-xl overflow-hidden shadow-lg">
                <img 
                  src="https://i.ibb.co/5X3jHptJ/insanligin-etkileyicileri-konferansi-2084.jpg" 
                  alt="أطفال يدرسون"
                  className="w-full h-[250px] sm:h-[300px] object-cover"
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-600" />
                    <div>
                      <p className="text-lg font-bold text-gray-800">50,000+</p>
                      <p className="text-[10px] text-gray-600">{t('beneficiaries')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Vision - Compact */}
      <section className="py-10 sm:py-12 lg:py-16 bg-gradient-to-br from-gray-100 to-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="relative rounded-xl overflow-hidden shadow-lg">
              <img 
                src="https://i.ibb.co/qt4f4cg/calisma-alanlarimiz-yardim-sektoru.jpg" 
                alt="رؤيتنا"
                className="w-full h-[250px] sm:h-[300px] object-cover"
              />

            </div>
            <div>
              <div className="inline-flex items-center gap-2 bg-white text-sky-600 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 shadow-sm">
                <Eye className="w-3.5 h-3.5" />
                <span>{t('vision')}</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 mb-4">
                {t('visionTitle')}
              </h2>
              <div className="relative bg-white rounded-xl p-6 sm:p-8 shadow-md border-r-4 border-sky-500">
                {/* Quote Icon */}
                <div className="absolute bottom-3 right-3 text-sky-200">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                  </svg>
                </div>
                
                {/* Quote Text */}
                <div className="relative z-10">
                  <p className="text-lg sm:text-xl text-gray-800 leading-relaxed font-medium text-center italic">
                    &quot;{t('visionQuote')}&quot;
                  </p>
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Goals - Compact & Clean */}
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-600 px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
              <Target className="w-3.5 h-3.5" />
              <span>{t('goals')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
              {t('goalsTitle')}
            </h2>
            <p className="text-gray-600 text-sm max-w-xl mx-auto">
              {t('goalsDesc')}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Image */}
            <div className="relative rounded-xl overflow-hidden shadow-lg h-[280px] sm:h-[350px]">
              <img 
                src="https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg" 
                alt="أهدافنا"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-sky-600/60 to-indigo-600/60"></div>
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="text-center text-white">
                  <Target className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold mb-1">{t('goalsCount')}</h3>
                  <p className="text-white/90 text-sm">{t('goalsSubtitle')}</p>
                </div>
              </div>
            </div>

            {/* Goals List */}
            <div className="space-y-2.5">
              {goals.map((goal, index) => (
                <div 
                  key={index}
                  className="group border bg-white rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-300 border-r-4"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center group-hover:bg-sky-500 transition-colors">
                      <CheckCircle className="w-4 h-4 text-sky-600 group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-gray-700 leading-relaxed text-xs sm:text-sm flex-1">
                      {getLocalizedProperty(goal, 'text')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: President Message - Compact */}
      <section className="py-10 sm:py-12 lg:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-600 px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('presidentMessage')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
              {t('presidentTitle')}
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* President Image */}
            <div className="lg:col-span-1">
              <div className="relative rounded-xl overflow-hidden shadow-lg sticky top-4">
                <img 
                  src="https://i.ibb.co/rKTrMkzj/gozbebekkleri-hakkimizda.jpg" 
                  alt="رئيسة الجمعية"
                  className="w-full h-[320px] sm:h-[380px] object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <h3 className="text-white font-bold text-base mb-0.5">{t('presidentName')}</h3>
                  <p className="text-sky-300 text-xs">{t('presidentPosition')}</p>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md">
                <div className="text-gray-700 leading-relaxed space-y-3 text-sm sm:text-base">
                  {presidentMessage.map((paragraph, index) => (
                    <p key={index} className={index === presidentMessage.length - 1 ? "font-semibold text-sky-700 text-sm" : ""}>
                      {getLocalizedProperty(paragraph, 'text')}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compact CTA */}
      <section className="py-12 sm:py-16 bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1200&h=300&fit=crop" 
            alt="background"
            className="w-full h-full object-cover opacity-30 blur-sm"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <Heart className="w-12 h-12 text-white mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            {t('ctaTitle')}
          </h2>
          <p className="text-white/90 text-sm sm:text-base mb-6 max-w-xl mx-auto">
            {t('ctaDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="bg-white text-sky-600 px-6 py-3 rounded-full font-bold text-sm hover:bg-sky-50 transition-all shadow-lg hover:shadow-xl hover:scale-105">
              {t('donateNow')}
            </button>
            <button className="bg-sky-700 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-sky-800 transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-white/30">
              {t('contactUs')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;