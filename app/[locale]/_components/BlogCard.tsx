"use client";

import { Link } from "@/i18n/routing";
import React from "react";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

interface BlogCardProps {
  title: string;
  image: string;
  link?: string;
  description?: string;
}

const BlogCard: React.FC<BlogCardProps> = ({ title, image, link = "#", description }) => {
  const t = useTranslations("BlogCard");
  return (
    <Link href={link} className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 h-full">
      {/* Image */}
      <div className="relative overflow-hidden h-48 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 group-hover:text-[#025EB8] transition-colors">
          {title}
        </h3>
        {description && (
          <p className="text-gray-500 text-xs line-clamp-2 mb-3">{description}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-[#025EB8] group-hover:text-[#FA5D17] transition-colors">
          {t("readMore")} <MoreHorizontal className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
};

export default BlogCard;
