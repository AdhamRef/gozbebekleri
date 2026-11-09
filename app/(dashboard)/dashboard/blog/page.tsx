"use client"
import { DeleteContentDialog } from "@/components/dashboard/content-editor/DeleteContentDialog";

import { ContentToolsDialog } from "@/components/dashboard/content-editor/ContentToolsDialog";
import { useState, useEffect, useMemo, useCallback } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { DataTable } from "../_components/data-table"
import { getBlogColumns, type BlogRow } from "../_components/blogColumns"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLocale } from "next-intl"
import { Globe } from "lucide-react"


export default function BooksManagement() {
  const locale = useLocale() as string
  const [deleteId,setDeleteId]=useState<string | null>(null)
  const [blogs, setBlogs] = useState<BlogRow[]>([])
  const [activeLocale, setActiveLocale] = useState<string>(locale || "ar")

  const fetchPosts = async (lang: string) => {
    try {
      const response = await axios.get("/api/posts", {
        params: { locale: lang, limit: 500 },
      })
      const items = response.data?.items ?? response.data ?? []
      setBlogs(Array.isArray(items) ? items : [])
    } catch (error) {
      console.error("Error fetching posts:", error)
      toast({
        title: "خطأ",
        description: "فشل تحميل المقالات. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchPosts(activeLocale)
  }, [activeLocale])

  const handleDeletePost = useCallback(async (id:string) => { setDeleteId(id) }, [])

  const columns = useMemo(
    () => getBlogColumns(handleDeletePost),
    [handleDeletePost]
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {deleteId ? <DeleteContentDialog kind="blog" id={deleteId} onClose={()=>setDeleteId(null)} onDeleted={()=>setBlogs(prev=>prev.filter(row=>row.id!==deleteId))} /> : null}
      <ContentToolsDialog kind="blog" scopeIds={blogs.map(row=>row.id)} />

      <Card className="p-8">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>إدارة المقالات</CardTitle>
            <Tabs value={activeLocale} onValueChange={setActiveLocale} className="w-auto">
              <TabsList className="flex flex-wrap gap-1 max-w-full" dir="rtl">
                <TabsTrigger value="ar" className="gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  العربية
                </TabsTrigger>
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="fr">Français</TabsTrigger>
                <TabsTrigger value="tr">Türkçe</TabsTrigger>
                <TabsTrigger value="id">Bahasa</TabsTrigger>
                <TabsTrigger value="pt">Português</TabsTrigger>
                <TabsTrigger value="es">Español</TabsTrigger>
                <TabsTrigger value="de">Deutsch</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            createLink="/dashboard/blog/create"
            columns={columns}
            data={blogs}
            searchPlaceholder="ابحث في المقالات ..."
            createLabel="مقال جديد"
            noResultsLabel="لا يوجد مقال"
          />
        </CardContent>
      </Card>
    </div>
  )
}
