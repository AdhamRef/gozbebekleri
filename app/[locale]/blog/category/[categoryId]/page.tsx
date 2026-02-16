'use server'
import axios from "axios";
import { Metadata } from "next";
import MainPage from "./_components/MainPage";


interface CategoryProps {
  params: {
    locale: string;
    categoryId: string;
  };
}

// Generate metadata for the category page
export async function generateMetadata({ params }: CategoryProps): Promise<Metadata> {
  // const locale = useLocale(); // Get the current locale (ar or en)
  const fetchCategoryData = async (): Promise<Category> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://gozbebekleri.org";
      const locale = params.locale || 'ar';
      const response = await axios.get(
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


  return {
    title: `${category.title} - قرة العيون`,
    description: category.description,
    openGraph: {
      title: `${category.title} - قرة العيون`,
      description: category.description,
      images: [
        {
          url: category.image || "/default-category-bg.jpg",
          width: 1200,
          height: 630,
          alt: category.title,
        },
      ],
      url: `https://gozbebekleri.org/ar/categories/${params.categoryId}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.title} - قرة العيون`,
      description: category.description,
      images: [category.image || "/default-category-bg.jpg"],
    },
    alternates: {
      canonical: `https://gozbebekleri.org/ar/categories/${params.categoryId}`,
    },
  };
}

const PostCategoryPage: React.FC<CategoryProps> = ({ params }) => {
  return (
  <MainPage id={params.categoryId} />
  );
};

export default PostCategoryPage;