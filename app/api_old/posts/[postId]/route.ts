import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params;
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get("lang") || "en"; // Default to English if no lang is provided

    // Fetch the post with its category
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { category: true },
    });

    if (!post) {
      return new NextResponse("Post not found", { status: 404 });
    }

    // Fetch similar posts
    const similarPosts = await prisma.post.findMany({
      where: {
        category_id: post.category?.id,
        id: { not: postId },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    // Filter response based on the language
    const filteredPost = {
      id: post.id,
      title: lang === "ar" ? post.titleAR : post.titleEN,
      image: lang === "ar" ? post.imageAR : post.imageEN,
      description: lang === "ar" ? post.descriptionAR : post.descriptionEN,
      content: lang === "ar" ? post.contentAR : post.contentEN,
      published: post.published,
      category: {
        id: post.category?.id,
        name: lang === "ar" ? post.category?.nameAR : post.category?.nameEN,
      },
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    const filteredSimilarPosts = similarPosts.map((similarPost) => ({
      id: similarPost.id,
      title: lang === "ar" ? similarPost.titleAR : similarPost.titleEN,
      image: lang === "ar" ? similarPost.imageAR : similarPost.imageEN,
      description: lang === "ar" ? similarPost.descriptionAR : similarPost.descriptionEN,
      content: lang === "ar" ? similarPost.contentAR : similarPost.contentEN,
      published: similarPost.published,
      createdAt: similarPost.createdAt,
      updatedAt: similarPost.updatedAt,
    }));

    return NextResponse.json(
      { post: filteredPost, similarPosts: filteredSimilarPosts },
      { status: 200 }
    );
  } catch (error) {
    console.log("[POST_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params;
    const values = await req.json();

    // Destructure and omit `id` from the values
    const { id, ...updateData } = values;

    const post = await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        ...updateData, // Pass the sanitized data
      },
    });

    return NextResponse.json(post, { status: 200 });
  } catch (error) {
    console.log("[POST_UPDATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    // Check if the user is the owner of the post
    const postOwner = await prisma.post.findFirst({
      where: {
        id: params.postId,
      },
    });
    if (!postOwner) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the post with its chapters and Mux data
    const post = await prisma.post.findUnique({
      where: {
        id: params.postId,
      },
    });

    if (!post) {
      return new NextResponse("Post not found", { status: 404 });
    }

    // Delete the post from the database
    const deletedPost = await prisma.post.delete({
      where: {
        id: params.postId,
      },
    });

    return NextResponse.json(deletedPost);
  } catch (error) {
    console.error("[POST_ID_DELETE]", error);
    return new NextResponse("Error deleting post", { status: 500 });
  }
}