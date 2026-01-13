import { Separator } from "@/components/ui/separator";
import axios from "axios";
import { cookies } from "next/headers";
import { redirect } from "@/i18n/routing";
import { notFound } from "next/navigation";
import BlogEditor from "../../../../blog/_components/BlogEditor"
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import getPost from "@/actions/get-post";

export const revalidate = 0;

interface PostEditorPageProps {
  params: { postId: string };
}

interface ImageData {
  fileName: string;
  publicUrl: string;
}


export default async function PostEditorPage({ params }: PostEditorPageProps) {
  // Authenticate user
  const postId = params.postId;

  // Fetch post
  const post = await getPost(postId);
  if (!post) {
    return notFound();
  }

  const categories = await prisma.postCategory.findMany({
    orderBy: { nameAR: "asc" },
  });

  const categoryOptions = categories.map((category) => ({
    label: category.nameAR,
    value: category.id,
  }));

  return (

    <div className="container mx-auto">
      <Card className="w-full mx-auto shadow-lg">
        <CardHeader className="bg-gray-50 border-b border-gray-200 py-6 px-6">
            <CardTitle className="text-2xl font-bold text-gray-800">
              تحرير المقال
            </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          
            <BlogEditor
              post={post}
              categories={categoryOptions}
            />
        </CardContent>
      </Card>
    </div>
  );
}