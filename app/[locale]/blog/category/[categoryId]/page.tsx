import axios from "axios";
import { Metadata } from "next";
import MainPage from "./_components/MainPage";


interface CategoryProps {
  params: Promise<{
    locale: string;
    categoryId: string;
  }>;
}

type CategoryMetadata = { name: string; title?: string | null; description?: string | null; image?: string | null; slug?: string | null };

// Generate metadata for the category page
export async function generateMetadata(args: CategoryProps): Promise<Metadata> {
  const params = await args.params;
  const fetchCategoryData = async (): Promise<CategoryMetadata> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const locale = params.locale || 'ar';
      const response = await axios.get<CategoryMetadata>(
        `${baseUrl}/api/post-categories/${params.categoryId}`,
        { params: { locale } }
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch category data:", error);
      throw new Error("Failed to fetch category data");
    }
  };

  const category = await fetchCategoryData();
  const title = category.title || category.name;
  const description = category.description || "";

  return {
    title: `${title} - قرة العيون`,
    description,
    openGraph: {
      title: `${title} - قرة العيون`,
      description,
      images: [
        {
          url: category.image || "/default-category-bg.jpg",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      url: `https://gozbebekleri.org/${params.locale || "ar"}/blog/category/${category.slug || params.categoryId}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - قرة العيون`,
      description,
      images: [category.image || "/default-category-bg.jpg"],
    },
    alternates: {
      canonical: `https://gozbebekleri.org/${params.locale || "ar"}/blog/category/${category.slug || params.categoryId}`,
    },
  };
}

export default async function PostCategoryPage(args: CategoryProps) {
  const params = await args.params;
  return <MainPage id={params.categoryId} />;
}