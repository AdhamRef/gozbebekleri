"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { DataTable } from "../_components/data-table"
import { Category, Post } from "@prisma/client"
import { blogColumns } from "../_components/blogColumns"

interface BlogsWithChapters extends Post {
  category: Category;
}

export default function BooksManagement() {
  const [blogs, setBlogs] = useState<BlogsWithChapters[]>([])

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await axios.get("/api/posts")
      setBlogs(response.data)
      console.log(response)
    } catch (error) {
      console.error("Error fetching books:", error)
      toast({
        title: "Error",
        description: "Failed to fetch books. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ادارة المقالات</CardTitle>
      </CardHeader>
      <CardContent>
      <DataTable createLink="/dashboard/blog/create" columns={blogColumns} data={blogs} searchPlaceholder={"ابحث في المقالات ..."} createLabel={"مقال جديد"} noResultsLabel={"لا يوجد مقال"} />
      </CardContent>
    </Card>
  )
}

