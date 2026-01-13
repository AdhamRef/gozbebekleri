import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// export async function POST(req: NextRequest) {
//   try {
//     const session = await getCurrentUser();
//     if (!session) {
//       return new NextResponse("Unauthorized", { status: 401 });
//     }

//     const { title } = await req.json();

//     const course = await db.post.create({
//       data: {
//         author_id: session?.user.id,
//         title
//       }
//     });

//     return NextResponse.json(course, { status: 200 });
//   } catch (error) {
//     console.log("[COURSES]", error);
//     return new NextResponse("Internal Error", { status: 500 });
//   }
// }

export async function GET(req: NextRequest) {
  try {
    // Extract the `lang` parameter from the request URL
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en"; // Default to English if no lang is provided

    // Fetch all categories
    const categories = await prisma.postCategory.findMany();

    // Filter the response based on the language
    const filteredCategories = categories.map((category) => ({
      id: category.id,
      name: lang === "ar" ? category.nameAR : category.nameEN,
      title: lang === "ar" ? category.titleAR : category.titleEN,
      description: lang === "ar" ? category.descriptionAR : category.descriptionEN,
      image: lang === "ar" ? category.imageAR : category.imageEN,
      createdAt: category.createdAt,
    }));

    return NextResponse.json(filteredCategories, { status: 200 });
  } catch (error) {
    console.log("[CATEGORIES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}