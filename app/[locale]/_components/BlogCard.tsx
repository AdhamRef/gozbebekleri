"use client";

import React from "react";

interface BlogCardProps {
  title: string;
  image: string;
  link?: string;
}

const BlogCard: React.FC<BlogCardProps> = ({ title, image, link = "#" }) => {
  return (
    <div className="group relative bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer h-[280px] sm:h-[320px]">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>

      {/* Content at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
        <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 line-clamp-2 group-hover:text-orange-400 transition-colors duration-300">
          {title}
        </h3>
        <a
          href={link}
          className="inline-flex items-center gap-1 text-orange-400 font-semibold hover:text-orange-300 text-xs sm:text-sm transition-colors"
        >
          المزيد
          <span className="group-hover:translate-x-1 transition-transform duration-300">
            ←
          </span>
        </a>
      </div>
    </div>
  );
};

export default BlogCard;