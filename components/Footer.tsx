'use client'
import React, { useState } from 'react';
import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Send } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const Footer = () => {
  const t = useTranslations('Footer');
  const locale = useLocale() as 'ar' | 'en' | 'fr';
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Helper function to get locale-specific property
  const getLocalizedProperty = (obj: any, key: string) => {
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    return obj[localeKey] || obj[key] || '';
  };

  // Categories with locale-specific names
  const categories = [
    { id: '1', nameAr: 'الحالات الطبية', nameEn: 'Medical Cases', nameFr: 'Cas médicaux' },
    { id: '2', nameAr: 'كفالة الأيتام', nameEn: 'Orphan Sponsorship', nameFr: 'Parrainage d\'orphelin' },
    { id: '3', nameAr: 'المشاريع التعليمية', nameEn: 'Educational Projects', nameFr: 'Projets éducatifs' },
    { id: '4', nameAr: 'الإغاثة العاجلة', nameEn: 'Emergency Relief', nameFr: 'Secours d\'urgence' }
  ];

  // Quick links with locale-specific names
  const quickLinks = [
    { textAr: 'من نحن', textEn: 'About Us', textFr: 'À propos' },
    { textAr: 'الحملات', textEn: 'Campaigns', textFr: 'Campagnes' },
    { textAr: 'اتصل بنا', textEn: 'Contact Us', textFr: 'Contactez-nous' },
    { textAr: 'سياسة الخصوصية', textEn: 'Privacy Policy', textFr: 'Politique de confidentialité' }
  ];

  // Contact info with locale-specific text
  const contactInfo = [
    { Icon: MapPin, textAr: 'الرياض، السعودية', textEn: 'Riyadh, Saudi Arabia', textFr: 'Riyad, Arabie Saoudite' },
    { Icon: Phone, textAr: '+966 123 456 789', textEn: '+966 123 456 789', textFr: '+966 123 456 789' },
    { Icon: Mail, textAr: 'info@al-amal.com', textEn: 'info@al-amal.com', textFr: 'info@al-amal.com' }
  ];

  const handleEmailSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    // Simulate API call
    setTimeout(() => {
      setSubmitMessage(t('subscribeSuccess'));
      setEmail('');
      setIsSubmitting(false);
      setTimeout(() => setSubmitMessage(''), 3000);
    }, 1000);
  };

  return (
    <footer className="bg-gradient-to-tl from-blue-800 to-blue-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Top Section - Logo & Newsletter */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">

          {/* Brand Section */}
          <div className="flex-1 max-lg:text-center">
            <a href="/" className="inline-flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity mb-2 sm:mb-3">
              <img src="https://i.ibb.co/ZwcJcN1/logo.webp" className="h-10 sm:h-12 lg:h-14" alt="Logo" />
            </a>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed mb-3 sm:mb-4 max-w-2xl mx-auto lg:mx-0">
              {t('description')}
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
            <h3 className="text-sm sm:text-base font-semibold mb-2">{t('newsletterTitle')}</h3>
            <p className="text-white/80 text-xs mb-3">
              {t('newsletterDesc')}
            </p>
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                disabled={isSubmitting}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all disabled:opacity-50"
              />
              <button
                onClick={handleEmailSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-white text-blue-900 rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Send className="h-3.5 w-3.5" />
                {isSubmitting ? t('subscribing') : t('subscribe')}
              </button>
            </div>
            {submitMessage && (
              <p className={`mt-2 text-xs ${submitMessage.includes('نجاح') || submitMessage.includes('Success') || submitMessage.includes('réussi') ? 'text-green-300' : 'text-red-300'}`}>
                {submitMessage}
              </p>
            )}
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-6">

          {/* Quick Links */}
          <div className="">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">{t('quickLinks')}</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a href="#" className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors">
                    {getLocalizedProperty(link, 'text')}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">{t('categories')}</h3>
            <ul className="space-y-1.5 sm:space-y-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`/category/${category.id}`}
                    className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors"
                  >
                    {getLocalizedProperty(category, 'name')}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className=" sm:col-span-2 lg:col-span-1">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">{t('contactUs')}</h3>
            <ul className="space-y-2">
              {contactInfo.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-white/80">
                  <div className="bg-white/10 p-1.5 rounded-full">
                    <item.Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm">{getLocalizedProperty(item, 'text')}</span>
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
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
          <a
            href="https://www.jubyte.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 hover:text-white transition-colors"
          >
            {t('developedBy')}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;