import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { categoryId } = params;

    // Extract the `lang` parameter from the request URL
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en"; // Default to English if no lang is provided

    // Fetch the category with its posts
    const category = await prisma.postCategory.findUnique({
      where: {
        id: categoryId,
      },
      include: {
        posts: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!category) {
      return new NextResponse("Category not found", { status: 404 });
    }

    // Filter the response based on the language
    const filteredCategory = {
      id: category.id,
      name: lang === "ar" ? category.nameAR : category.nameEN,
      title: lang === "ar" ? category.titleAR : category.titleEN,
      description: lang === "ar" ? category.descriptionAR : category.descriptionEN,
      image: lang === "ar" ? category.imageAR : category.imageEN,
      posts: category.posts.map((post) => ({
        id: post.id,
        title: lang === "ar" ? post.titleAR : post.titleEN,
        image: lang === "ar" ? post.imageAR : post.imageEN,
        description: lang === "ar" ? post.descriptionAR : post.descriptionEN,
        content: lang === "ar" ? post.contentAR : post.contentEN,
        published: post.published,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      })),
      createdAt: category.createdAt,
    };

    return NextResponse.json(filteredCategory, { status: 200 });
  } catch (error) {
    console.log("[CATEGORY_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}