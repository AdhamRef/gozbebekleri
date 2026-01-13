"use server";

import React from "react";
import axios from "axios";
import { Metadata } from "next";
import MainPage from "./_components/MainPage";

interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
}

interface Props {
  params: {
    id: string;
  };
}

// Generate metadata for the category page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fetchCategoryData = async (): Promise<Category> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://alafiya.org";
      const response = await axios.get(`${baseUrl}/api/categories/${params.id}`);
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
      url: `https://alafiya.org/ar/categories/${params.id}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} - قرة العيون`,
      description: category.description,
      images: [category.image || "/default-category.jpg"],
    },
    alternates: {
      canonical: `https://alafiya.org/ar/categories/${params.id}`,
    },
  };
}

const CategoryPage = ({ params }: Props) => {
  return <MainPage id={params.id} />;
};

export default CategoryPage;
