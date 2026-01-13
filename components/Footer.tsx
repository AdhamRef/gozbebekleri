'use client'
import React, { useEffect, useState } from 'react';
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Send } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  icon?: string;
}

const Footer = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleEmailSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setSubmitMessage('تم الاشتراك بنجاح!');
      setEmail('');
    } catch (error) {
      setSubmitMessage('حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitMessage(''), 3000);
    }
  };

  return (
    <footer className="bg-gradient-to-tl from-blue-800 to-blue-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Top Section - Logo & Newsletter */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
          
          {/* Brand Section */}
          <div className="flex-1 text-center lg:text-right">
            <a href="/" className="inline-flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity mb-2 sm:mb-3">
              <img src="https://i.ibb.co/ZwcJcN1/logo.webp" className="h-10 sm:h-12 lg:h-14" alt="Logo" />
            </a>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed mb-3 sm:mb-4 max-w-2xl mx-auto lg:mx-0">
              منصة قرة العيون هي منصة خيرية تهدف إلى مساعدة أصحاب الحالات الطبية الحرجة و تقديم الدعم الطبي للمحتاجين في سوريا.
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="bg-white/10 p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="flex-1 bg-white/5 rounded-lg p-4 sm:p-5 border border-white/10">
            <h3 className="text-sm sm:text-base font-semibold mb-2 text-right">اشترك في نشرتنا البريدية</h3>
            <p className="text-white/80 text-xs mb-3 text-right">
              احصل على آخر التحديثات والحملات الجديدة
            </p>
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                disabled={isSubmitting}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-right disabled:opacity-50"
              />
              <button
                onClick={handleEmailSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-white text-blue-900 rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5" />
                {isSubmitting ? 'جاري الإرسال...' : 'اشترك'}
              </button>
            </div>
            {submitMessage && (
              <p className={`mt-2 text-xs text-right ${submitMessage.includes('نجاح') ? 'text-green-300' : 'text-red-300'}`}>
                {submitMessage}
              </p>
            )}
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-6">
          
          {/* Quick Links */}
          <div className="text-right">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">روابط سريعة</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              {['من نحن', 'الحملات', 'اتصل بنا', 'سياسة الخصوصية'].map((item, index) => (
                <li key={index}>
                  <a href="#" className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="text-right">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">الأقسام</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              {categories.slice(0, 4).map((category) => (
                <li key={category.id}>
                  <a
                    href={`/category/${category.id}`}
                    className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="text-right sm:col-span-2 lg:col-span-1">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">تواصل معنا</h3>
            <ul className="space-y-2">
              {[
                { Icon: MapPin, text: 'الرياض، السعودية' },
                { Icon: Phone, text: '+966 123 456 789' },
                { Icon: Mail, text: 'info@al-amal.com' }
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-white/80">
                  <div className="bg-white/10 p-1.5 rounded-full">
                    <item.Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20 my-4 sm:my-5" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs sm:text-sm text-center">
          <p className="text-white/80">
            © {new Date().getFullYear()} منصة قرة العيون. جميع الحقوق محفوظة.
          </p>
          <a
            href="https://www.jubyte.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white transition-colors"
          >
            تم التطوير بواسطة جوبايت للبرمجيات
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;