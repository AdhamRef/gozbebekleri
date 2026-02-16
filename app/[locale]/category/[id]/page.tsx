import React from "react";
import axios from "axios";
import { Metadata } from "next";
import MainPage from "./_components/MainPage";

interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  campaignCount?: number;
}

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

// Generate metadata for the category page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  const fetchCategoryData = async (): Promise<Category> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await axios.get(`${baseUrl}/api/categories/${id}?locale=${locale}&counts=true`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch category data:", error);
      throw new Error("Failed to fetch category data");
    }
  };

  const category = await fetchCategoryData();

  return {
    title: `${category.name} - قرة العيون`,
    description: category.description,
    openGraph: {
      title: `${category.name} - قرة العيون`,
      description: category.description,
      images: [
        {
          url: category.image || "/default-category.jpg",
          width: 1200,
          height: 630,
          alt: category.name,
        },
      ],
      url: `https://gozbebekleri.vercel.app/${locale}/categories/${id}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} - قرة العيون`,
      description: category.description,
      images: [category.image || "/default-category.jpg"],
    },
    alternates: {
      canonical: `https://gozbebekleri.vercel.app/${locale}/categories/${id}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { id, locale } = await params;
  return <MainPage id={id} locale={locale} />;
}