import React, { useState } from "react";
import { Heart, TrendingUp, Users, Award, CheckCircle, ArrowLeft, Sparkles } from "lucide-react";

const QuickDonate = () => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');

  const stats = [
    { icon: Users, value: "50,000+", label: "مستفيد" },
    { icon: Award, value: "250+", label: "مشروع خيري" },
    { icon: Heart, value: "13", label: "سنة من العطاء" },
    { icon: TrendingUp, value: "95%", label: "نسبة الشفافية" }
  ];

  const features = [
    "توصيل المساعدات للمحتاجين مباشرة",
    "تقارير شفافة لكل مشروع",
    "فريق محترف ومتخصص",
    "شراكات دولية موثوقة"
  ];

  const quickAmounts = ['٢٠ ₺', '٥٠ ₺', '١٠٠ ₺', '٢٠٠ ₺', '٥٠٠ ₺', '١٠٠٠ ₺'];

  return (
    <div className="relative min-h-[60vh] lg:min-h-[70vh] overflow-hidden" id="quick_donate">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://scontent.fcai19-7.fna.fbcdn.net/v/t39.30808-6/470243437_18027098369616682_8540981723326808434_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=127cfc&_nc_ohc=JAKLYhf9jXMQ7kNvwHkj6rB&_nc_oc=AdmnPPX8HgQE-x0unJu5J0JLWfeEi9os_7YI9piuHNb7RjkDOTfDWUC85XbycdbJmpc&_nc_zt=23&_nc_ht=scontent.fcai19-7.fna&_nc_gid=cbq9oOYyZFMH6nk0agSmmA&oh=00_Afq4m5UFHgTotxqzRwTPGQiFznOlYnC6_xPfYtafpMzZ3Q&oe=69698C68" 
          alt="background"
          className="w-full h-full object-cover sm:block hidden"
        />
        <img 
          src="https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg" 
          alt="background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/25"></div>
        {/* <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div> */}
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-orange-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <section className="relative z-10 container max-w-7xl mx-auto py-6 lg:py-8 px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          
          {/* Left Content */}
          <div className="space-y-3 lg:space-y-4">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg border border-white/30">
              <Heart className="w-3.5 h-3.5" />
              <span>جمعية معتمدة وموثوقة</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-2">
              <h2 className="text-orange-200 text-xs lg:text-sm font-bold">
                جمعية قرة العيون للإغاثة والتكافل
              </h2>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight flex gap-2">
                <span className="block py-2">13 عاما</span>
                <span className="block py-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-amber-200 to-orange-300">
                  مع الأمل
                </span>
              </h1>
            </div>

            {/* Description */}
            <p className="text-xs lg:text-sm leading-relaxed text-white/90">
              في الأعوام الأخيرة التي مرت بها العالم وخاصة البلاد الإسلامية بأزمات صحية وكارثية واقتصادية وسياسية، أصبح أطفالنا اليتامى والمحرومون أكثر المتضررين.
            </p>

            {/* Features List */}
            <div className="grid grid-cols-2 gap-2">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-1.5 group">
                  <CheckCircle className="w-3.5 h-3.5 text-orange-300 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-white/90 text-xs">{feature}</span>
                </div>
              ))}
            </div>

            {/* Stats Grid - Hidden on mobile, visible on larger screens */}
            <div className="hidden lg:grid grid-cols-4 gap-2 pt-2">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="text-center group hover:scale-105 transition-transform">
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20">
                      <Icon className="w-4 h-4 text-orange-300 mx-auto mb-1" />
                      <div className="text-lg font-bold text-white">{stat.value}</div>
                      <div className="text-[9px] text-white/70">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA Button */}
            <button className="group flex items-center gap-2 bg-white text-orange-900 px-4 py-2 rounded-lg hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl hover:scale-105">
              <span className="font-bold text-xs lg:text-sm">اكتشف المزيد عن قصتنا</span>
              <ArrowLeft className="w-3.5 h-3.5 group-hover:translate-x-[-4px] transition-transform" />
            </button>
          </div>

          {/* Right Side - Donation Card */}
          <div className="lg:sticky lg:top-6">
                        {/* Mobile Stats - Visible only on mobile */}
            <div className="grid grid-cols-4 gap-2 mb-3 lg:hidden">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="text-center">
                    <div className="bg-white/20 backdrop-blur-md rounded-lg p-2 border border-white/30">
                      <Icon className="w-3.5 h-3.5 text-orange-300 mx-auto mb-0.5" />
                      <div className="text-sm font-bold text-white">{stat.value}</div>
                      <div className="text-[9px] text-white/70 leading-tight">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-4 lg:p-5 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10"></div>
                <Sparkles className="absolute top-3 left-3 w-4 h-4 text-white/30" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="text-xs font-semibold">تبرع سريع</span>
                  </div>
                  <h3 className="text-lg lg:text-xl font-bold mb-1">ساهم في صنع الفرق</h3>
                  <p className="text-orange-50 text-xs">تبرعك يصنع الأمل في قلوب المحتاجين</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 lg:p-5 space-y-3">
                {/* Project Selection */}
                <div>
                  <label className="block text-gray-800 font-bold mb-2 text-xs">اختر المشروع</label>
                  <select className="w-full p-2 rounded-lg bg-gray-50 text-gray-800 border-2 border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer text-xs hover:bg-gray-100">
                    <option>🇵🇸 تبرع لفلسطين</option>
                    <option>🕌 بناء المساجد</option>
                    <option>📚 دعم التعليم</option>
                    <option>🏥 المساعدات الطبية</option>
                    <option>🍲 إفطار صائم</option>
                    <option>👶 كفالة يتيم</option>
                  </select>
                </div>

                {/* Quick Amount Buttons */}
                <div>
                  <label className="block text-gray-800 font-bold mb-2 text-xs">اختر المبلغ</label>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map((amount, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedAmount(amount)}
                        className={`p-2 rounded-lg font-bold transition-all text-xs ${
                          selectedAmount === amount
                            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md scale-105 ring-2 ring-orange-500/30'
                            : 'bg-gray-50 text-gray-800 hover:bg-orange-50 hover:text-orange-600 border-2 border-gray-200 hover:border-orange-300 hover:scale-105'
                        }`}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount Input */}
                <div>
                  <label className="block text-gray-800 font-bold mb-2 text-xs">أو أدخل مبلغا مخصصا</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="أدخل المبلغ"
                      className="w-full p-2 pr-10 rounded-lg bg-gray-50 text-gray-800 border-2 border-gray-200 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-xs hover:bg-gray-100"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₺</span>
                  </div>
                </div>

                {/* Donate Button */}
                <button className="w-full bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white py-2.5 rounded-lg font-bold hover:from-orange-700 hover:via-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-sm group">
                  <span className="flex items-center justify-center gap-2">
                    تبرع الآن
                    <Heart className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </span>
                </button>

                {/* Trust Badge */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-center gap-2 text-gray-600 text-[10px]">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    <span>معاملات آمنة ومشفرة</span>
                  </div>
                </div>
              </div>
            </div>


          </div>

        </div>
      </section>
    </div>
  );
};

export default QuickDonate;