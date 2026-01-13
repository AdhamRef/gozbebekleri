import React from 'react';
import { Target, Users, Heart, MessageSquare, CheckCircle, Eye, Sparkles } from 'lucide-react';

const AboutUs = () => {
  const goals = [
    "تقديم أفضل الخدمات المعيشية والصحية والنفسية والتعليمية للاطفال وذويهم",
    "إعداد جيل يتفوق على ذاته ويتخطى الصعاب التي تواجهه",
    "اكتشاف المهارات وتنمية الابداع وبناء قدرات الأطفال",
    "حماية الأطفال من الإستغلال بكافة أشكاله وتنمية الوعي لديهم",
    "تنشئة أجيال تتمتع بقيم وأخلاق سليمة",
    "إنشاء منظومة تربوية وتعليمية وصحية حديثة",
    "نرتقي بالأطفال نحو مستقبل مشرق"
  ];

  return (
    <div className="bg-white">
      {/* Compact Hero */}
      <section className="relative h-[250px] sm:h-[320px] mt-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&h=400&fit=crop" 
            alt="أطفال سعداء"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/60"></div>
        </div>
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center text-white px-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">من نحن</h1>
          <p className="text-sm sm:text-base lg:text-lg text-orange-200">
            جمعية قرة العيون للإغاثة والتكافل
          </p>
        </div>
      </section>

      {/* Section 1: About - Compact */}
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full text-xs font-semibold mb-4">
                <Heart className="w-3.5 h-3.5" />
                <span>جمعية قرة العيون</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-4">
                من نحن؟
              </h2>
              <div className="text-gray-700 leading-relaxed space-y-3 text-sm sm:text-base">
                <p>
                  جمعية تركية إغاثية تكافلية فاعلة في مجال رعاية الطفل في جميع أنحاء العالم، نسعى لتأمين حياة ومستقبل أفضل للأطفال والمساهمة في رفع المعاناة عنهم وتمكينهم من حقوقهم وبناء قدراتهم العقلية والجسدية.
                </p>
                <p>
                  نعمل على دمج الأطفال المحتاجين في المجتمع وتوعيتهم بحقوقهم وتعزيز الوضع الاجتماعي والاقتصادي والنفسي لذويهم من خلال برامج ومشاريع نوعية متميزة.
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
                    <Users className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="text-lg font-bold text-gray-800">50,000+</p>
                      <p className="text-[10px] text-gray-600">مستفيد</p>
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
              <div className="inline-flex items-center gap-2 bg-white text-orange-600 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 shadow-sm">
                <Eye className="w-3.5 h-3.5" />
                <span>رؤيتنا</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-800 mb-4">
                نحو مستقبل أفضل
              </h2>
              <div className="relative bg-white rounded-xl p-6 sm:p-8 shadow-md border-r-4 border-orange-500">
                {/* Quote Icon */}
                <div className="absolute bottom-3 right-3 text-orange-200">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                  </svg>
                </div>
                
                {/* Quote Text */}
                <div className="relative z-10">
                  <p className="text-lg sm:text-xl text-gray-800 leading-relaxed font-medium text-center italic">
                    &quot;إحداث فرق في عالم الطفولة من أجل جيل منتج، وتربية جيل يرفع نفسه والمجتمع&quot;
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
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
              <Target className="w-3.5 h-3.5" />
              <span>أهدافنا</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
              ما نسعى لتحقيقه
            </h2>
            <p className="text-gray-600 text-sm max-w-xl mx-auto">
              نعمل على تحقيق مجموعة من الأهداف السامية لخدمة الأطفال والمجتمع
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
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/60 to-amber-600/60"></div>
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="text-center text-white">
                  <Target className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold mb-1">7 أهداف</h3>
                  <p className="text-white/90 text-sm">لمستقبل أفضل</p>
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
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                      <CheckCircle className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-gray-700 leading-relaxed text-xs sm:text-sm flex-1">
                      {goal}
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
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>رسالة الرئيس</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
              كلمة رئيسة الجمعية
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
                  <h3 className="text-white font-bold text-base mb-0.5">السيد فاضل</h3>
                  <p className="text-orange-300 text-xs">رئيسة الجمعية العامة</p>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl p-5 sm:p-6 shadow-md">
                <div className="text-gray-700 leading-relaxed space-y-3 text-sm sm:text-base">
                  <p>
                    في عالمنا اليوم، وخاصة في الجغرافيا الإسلامية، فإن الذين يعانون أكثر من غيرهم من المشاكل مثل الأزمات السياسية، والأزمات الاقتصادية، والكوارث الطبيعية، هم بلا شك أبناؤنا.
                  </p>
                  <p>
                    ولكي لا نبقى مجرد متفرجين على هذه الأوضاع، فقد تحركنا من أجل جعل المستقبل أكثر ملاءمة لجميع الأطفال الذين نستطيع الوصول إليهم، وخاصة الأيتام.
                  </p>
                  <p>
                    نحن في جمعية جوزبيبيكلي نعمل على دعم أطفالنا والأيتام من خلال مشاريع مختلفة تشمل عائلاتهم وخاصة في مجالات الصحة والتعليم والتغذية منذ عام 2011.
                  </p>
                  <p>
                    وعندما يتعلق الأمر بأبنائنا فإن قائدنا هو نبينا العظيم صلى الله عليه وسلم. نحاول أن نتخذ هذه الحساسية عند نبينا قدوة، ونحاول أن نخفف من هموم أبنائنا أينما كانوا.
                  </p>
                  <p>
                    نعمل على دعم وملامسة حياة مئات الآلاف من الأطفال من خلال تذكيرهم بأنهم ليسوا عاجزين، بالتعاون مع موظفينا المدربين ومتطوعينا في مختلف بلدان العالم.
                  </p>
                  <p className="font-semibold text-orange-700 text-sm">
                    وستواصل جمعيتنا العمل معكم بأصدق المشاعر، بعيداً عن أي هدف ربحي، انطلاقاً من مبدأ "خدمة الشعب هي خدمة لله".
                  </p>
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
            كن جزءاً من التغيير
          </h2>
          <p className="text-white/90 text-sm sm:text-base mb-6 max-w-xl mx-auto">
            انضم إلينا في رحلتنا لبناء مستقبل أفضل للأطفال حول العالم
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button className="bg-white text-orange-600 px-6 py-3 rounded-full font-bold text-sm hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl hover:scale-105">
              تبرع الآن
            </button>
            <button className="bg-orange-700 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-orange-800 transition-all shadow-lg hover:shadow-xl hover:scale-105 border-2 border-white/30">
              تواصل معنا
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;