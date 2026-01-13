import { prisma } from "@/lib/prisma";

export default async function getPost(postId: string) {
    try {
      const post = await prisma.post.findUnique({
        where: {
          id: postId,
        },
        include: {
          category: true
        }
      });

      console.log(post)
      
      return post;
    } catch (error) {
      console.error("Error fetching post:", error);
      return null;
    }
  }