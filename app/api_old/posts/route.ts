import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();
    
    const course = await prisma.post.create({
      data: {
        titleAR: title,
        titleEN: title,
      }
    });
    
    return NextResponse.json(course, { status: 200 });
  } catch (error) {
    console.log("[COURSES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      include: {
        category: true,
      }
    });
    
    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    console.log("[COURSES]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
