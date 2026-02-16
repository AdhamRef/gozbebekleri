"use client";

import React, { useState } from "react";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin,
  MessageCircle,
  User,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations, useLocale } from "next-intl";

const ContactPage = () => {
  const t = useTranslations("ContactUs");
  const locale = useLocale() as "ar" | "en" | "fr";

  // Helper function to get locale-specific property
  const getLocalizedProperty = (obj: any, key: string) => {
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    return obj[localeKey] || obj[key] || "";
  };

  const messageTypes = [
    { valueAr: "اقتراح", valueEn: "Suggestion", valueFr: "Suggestion" },
    { valueAr: "يتمنى", valueEn: "Wish", valueFr: "Souhait" },
    { valueAr: "يشتكي", valueEn: "Complaint", valueFr: "Plainte" }
  ];

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    messageType: getLocalizedProperty(messageTypes[0], "value"),
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.email || !formData.message) {
      alert(t("requiredFields"));
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSuccess(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setFormData({
        name: "",
        phone: "",
        email: "",
        messageType: getLocalizedProperty(messageTypes[0], "value"),
        message: ""
      });
      setIsSuccess(false);
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const contactInfo = [
    {
      icon: MapPin,
      titleAr: "العنوان",
      titleEn: "Address",
      titleFr: "Adresse",
      content: "İstanbul",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: Phone,
      titleAr: "الهاتف",
      titleEn: "Phone",
      titleFr: "Téléphone",
      content: "+90 212 288 59 30",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: Mail,
      titleAr: "البريد الإلكتروني",
      titleEn: "Email",
      titleFr: "E-mail",
      content: "info@gozbebekleri.org",
      color: "text-sky-600",
      bgColor: "bg-sky-50"
    }
  ];

  const socialMedia = [
    { icon: Facebook, name: "Facebook", color: "hover:text-blue-600", link: "#" },
    { icon: Instagram, name: "Instagram", color: "hover:text-pink-600", link: "#" },
    { icon: Twitter, name: "Twitter", color: "hover:text-sky-500", link: "#" },
    { icon: Linkedin, name: "LinkedIn", color: "hover:text-blue-700", link: "#" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Hero Section */}
      <div className="relative text-white py-16 sm:py-20 mt-14 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://i.ibb.co/Xm58ssT/481207566-944951421141366-1158434782285969951-n-1.png" 
            alt="أطفال سعداء"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/60"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <MessageCircle className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
            {t("pageTitle")}
          </h1>
          <p className="text-sm sm:text-base max-w-xl mx-auto opacity-90">
            {t("pageSubtitle")}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-10 max-w-6xl">
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contact Cards */}
            <div className="space-y-3">
              {contactInfo.map((info, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all duration-300 border border-gray-100"
                >
                  <div className="flex items-start gap-3">
                    <div className={`${info.bgColor} ${info.color} p-2 rounded-lg`}>
                      <info.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 mb-1 text-sm">
                        {getLocalizedProperty(info, "title")}
                      </h3>
                      <p className="text-gray-600 text-xs break-words">
                        {getLocalizedProperty(info, "title") === t("phone") ? <span dir="ltr">{info.content}</span> : info.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Social Media */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 text-md">
                {t("followUs")}
              </h3>
              <div className="flex gap-2">
                {socialMedia.map((social, index) => (
                  <a
                    key={index}
                    href={social.link}
                    className={`bg-gray-100 p-2 rounded-lg text-gray-700 ${social.color} transition-all duration-300 hover:scale-110`}
                    aria-label={social.name}
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Image */}
            <div className="hidden lg:block">
              <img 
                src="https://i.ibb.co/Q7zfYF8J/558969696-1112724364364070-4681565038920366683-n.jpg"
                alt="اتصل بنا"
                className="rounded-xl shadow-md w-full object-cover h-48"
              />
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 border border-gray-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
                {t("contactForm")}
              </h2>
              <p className="text-gray-600 mb-5 text-xs sm:text-sm">
                {t("formSubtitle")}
              </p>

              {isSuccess ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-green-800 mb-1">
                    {t("successTitle")}
                  </h3>
                  <p className="text-green-700 text-sm">
                    {t("successMessage")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1.5 text-xs">
                      {t("nameLabel")} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors text-sm"
                        placeholder={t("namePlaceholder")}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1.5 text-xs">
                      {t("phoneLabel")} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors text-sm"
                        placeholder={t("phonePlaceholder")}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1.5 text-xs">
                      {t("emailLabel")} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors text-sm"
                        placeholder={t("emailPlaceholder")}
                      />
                    </div>
                  </div>

                  {/* Message Type */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1.5 text-xs">
                      {t("messageTypeLabel")} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="messageType"
                      value={formData.messageType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors text-sm"
                    >
                      {messageTypes.map((type, index) => (
                        <option key={index} value={getLocalizedProperty(type, "value")}>
                          {getLocalizedProperty(type, "value")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1.5 text-xs">
                      {t("messageLabel")} <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors resize-none text-sm"
                      placeholder={t("messagePlaceholder")}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white py-2.5 rounded-lg font-bold text-sm transition-all duration-300 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t("sending")}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" />
                        {t("sendMessage")}
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-white pt-8 sm:pt-10">
        <div className="container mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-5">
            {t("ourLocation")}
          </h2>
          <div className="overflow-hidden shadow-md h-80 sm:h-[450px] bg-gray-200">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d12045.323612102446!2d28.84692565197555!3d40.99613001478335!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14caa4a80b2a1fef%3A0xffbc01efa7423860!2zR8O2emJlYmVrbGVyaSBZYXJkxLFtbGHFn21hIHZlIERheWFuxLHFn21hIERlcm5lxJ9p!5e0!3m2!1str!2str!4v1768306507839!5m2!1str!2str"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;