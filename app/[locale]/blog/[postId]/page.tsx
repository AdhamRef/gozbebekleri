"use server";

import React from "react";
import axios from "axios";
import { Metadata } from "next";
import MainPage from "./_components/MainPage"

// Import types from Prisma
import { Post as PrismaPost, Category as PrismaCategory } from "@prisma/client";

// Extend Prisma types with additional properties
interface ExtendedPost extends PrismaPost {
  category_name: string;
  category?: Partial<PrismaCategory> | null;
}

interface BlogPostProps {
  params: {
    postId: string;
  };
}

// Generate metadata for the blog post page
export async function generateMetadata({
  params,
}: BlogPostProps): Promise<Metadata> {
  const fetchPostData = async (): Promise<ExtendedPost> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://alafiya.org";
      const response = await axios.get(`${baseUrl}/api/posts/${params.postId}`, {
        params: { lang: "ar" }, // Pass the locale to the API
      });
      return response.data.post;
    } catch (error) {
      console.error("Failed to fetch post data:", error);
      throw new Error("Failed to fetch post data");
    }
  };

  const post = await fetchPostData();

  return {
    title: `${post.title} - قرة العيون`,
    description: post.description,
    openGraph: {
      title: `${post.title} - قرة العيون`,
      description: post.description,
      images: [
        {
          url: post.image || "/default-post-image.jpg",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      url: `https://alafiya.org/ar/blog/${params.postId}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} - قرة العيون`,
      description: post.description,
      images: [post.image || "/default-post-image.jpg"],
    },
    alternates: {
      canonical: `https://alafiya.org/ar/blog/${params.postId}`,
    },
  };
}

const BlogPost: React.FC<BlogPostProps> = ({ params }) => {
  return <MainPage id={params.postId} />;
};

export default BlogPost;
