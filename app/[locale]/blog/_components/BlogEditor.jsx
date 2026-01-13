"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { v4 } from "uuid";
import slugify from "react-slugify";
import * as z from "zod";

// Uppy imports
import Uppy from "@uppy/core";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import { DashboardModal } from "@uppy/react";
import Tus from "@uppy/tus";

import {
  SparklesIcon,
  PaperclipIcon,
  Loader2 as SpinnerIcon,
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Custom components and config
import WysiwygEditor from "./wysiwyg/wysiwyg-editor";
import { mainCategoryConfig } from "@/lib/blog";
import { defaultEditorContent } from "./wysiwyg/default-content";

// Custom upload components
import ImageForm from "./_components/image-form";
import CategoryForm from "./_components/category-form";
import TitleForm from "./_components/title-form";
import DescriptionForm from "./_components/description-form";

// Validation schema
const postEditFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  image: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  content: z.string().optional(),
});

// Configuration
const protectedEditorConfig = {
  generalTitle: "المعلومات العامة",
  generalDescription: "قدم التفاصيل الأساسية لمقالك",
  formTitle: "العنوان",
  placeHolderTitle: "أدخل عنوان المقال",
  placeholderSlug: "أدخل رابط المقال",
  generateSlug: "توليد الرابط",
  categoryTitle: "التصنيف",
  categoryDescription: "اختر تصنيفاً لمقالك",
  coverImageTitle: "الصورة الرئيسية",
  coverImageDescription: "قم برفع صورة رئيسية لمقالك",
  placeholderImage: "رابط الصورة الرئيسية",
  formCoverImageUploadFile: "رفع الصورة الرئيسية",
  galleryImageTitle: "صور المعرض",
  galleryImageDescription: "يمكنك رفع حتى ",
  chooseFile: "اختر الملفات",
  shortDescriptionTitle: "الوصف القصير",
  shortDescriptionDescription: "قدم وصفاً مختصراً لمقالك",
  placeholderDescription: "أدخل وصف المقال",
  submit: "حفظ",
  delete: "مسح",
  cancel: "إلغاء",
  successMessage: "تم تحديث المقال بنجاح",
  errorMessage: "فشل تحديث المقال",
  successMessageImageUpload: "تم رفع الصورة بنجاح",
  errorMessageImageUpload: "فشل رفع الصورة",
  formImageNote: "الصور حتى حجم 6 ميجابايت، بصيغة JPG/PNG",
  placeholderContent: "أدخل محتوى المقال",
};

const protectedPostConfig = {
  pleaseWait: "برجاء الانتظار ...",
};

const BlogEditor = ({ post, userId, categories }) => {
  const router = useRouter();


  // States
  const [isSaving, setIsSaving] = useState(false);
  const [showLoadingAlert, setShowLoadingAlert] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  // Content state
  const [contentEN, setContentEN] = useState(post?.contentEN || null);
  const [contentAR, setContentAR] = useState(post?.contentAR || null);
  const [activeLanguage, setActiveLanguage] = useState("ar");


  // Uppy instance for cover photo upload
  // const uppyCover = new Uppy({
  //   id: "cover-image",
  //   autoProceed: false,
  //   debug: false,
  //   allowMultipleUploadBatches: true,
  //   restrictions: {
  //     maxFileSize: 6000000,
  //     maxNumberOfFiles: 1,
  //   },
  // }).use(Tus, {
  //   endpoint: supabaseUploadURL,
  //   headers: {
  //     authorization: `Bearer ${token}`,
  //   },
  //   chunkSize: 6 * 1024 * 1024,
  //   allowedMetaFields: [
  //     "bucketName",
  //     "objectName",
  //     "contentType",
  //     "cacheControl",
  //   ],
  // });

  // uppyCover.on("file-added", (file) => {
  //   file.meta = {
  //     ...file.meta,
  //     bucketName: bucketNameCoverImage,
  //     objectName: `${userId}/${post.id}/${file.name}`,
  //     contentType: file.type,
  //   };
  // });

  // uppyCover.on("complete", async (result) => {
  //   if (result.successful.length > 0) {
  //     toast.success(protectedEditorConfig.successMessageImageUpload);
  //     router.refresh();
  //   } else {
  //     toast.error(protectedEditorConfig.errorMessageImageUpload);
  //   }
  //   setShowCoverModal(false);
  // });

  // Form setup
  const defaultValues = {
    titleAR: post.titleAR || "Untitled",
    titleEN: post.titleEN || "Untitled",
    imageAR: post.imageAR || "",
    imageEN: post.imageEN || "",
    categoryId: post.category_id || "",
    descriptionAR: post.descriptionAR || "Post description",
    descriptionEN: post.descriptionEN || "Post description",
    contentEN: contentEN || protectedEditorConfig.placeholderContent,
    contentAR: contentAR || protectedEditorConfig.placeholderContent,
  };

  const form = useForm({
    resolver: zodResolver(postEditFormSchema),
    defaultValues,
    mode: "onChange",
  });

  // Submit handler with Axios and Prisma API route
  const onSubmit = async (data) => {
    setShowLoadingAlert(true);
    setIsSaving(true);

    try {
      // Update post using Axios to call Prisma API route
      const response = await axios.patch(`/api/posts/${post.id}`, {
        titleAR: data.titleAR,
        titleEN: data.titleEN,
        imageAR: data.imageAR,
        imageEN: data.imageEN,
        descriptionAR: data.descriptionAR,
        descriptionEN: data.descriptionEN,
        contentEN: contentEN,
        contentAR: contentAR,
        category_id: data.categoryId,
      });

      // Success handling
      toast.success(protectedEditorConfig.successMessage);
      router.push(`/blog/${response.data.id}`);
    } catch (error) {
      // Error handling
      console.error("Post update error:", error);
      toast.error(protectedEditorConfig.errorMessage);
    } finally {
      setIsSaving(false);
      setShowLoadingAlert(false);
    }
  };

  // Delete handler
  const onDelete = async () => {
    setShowLoadingAlert(true);
    setIsSaving(true);

    try {
      // Delete post using Axios to call Prisma API route
      await axios.delete(`/api/posts/${post.id}`);

      // Success handling
      router.back();
    } catch (error) {
      // Error handling
      console.error("Post delete error:", error);
      toast.error(protectedEditorConfig.errorMessage);
    } finally {
      setIsSaving(false);
      setShowLoadingAlert(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-8">
          {/* Cards and form fields */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>{protectedEditorConfig.generalTitle}</CardTitle>
              <CardDescription>
                {protectedEditorConfig.generalDescription}
              </CardDescription>
            </CardHeader>
            <Separator className="mb-8" />
            <CardContent className="space-y-4">
              <TitleForm initialData={post} postId={post.id} />
            </CardContent>
          </Card>

          {/* Category */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>{protectedEditorConfig.categoryTitle}</CardTitle>
              <CardDescription>
                {protectedEditorConfig.categoryDescription}
              </CardDescription>
            </CardHeader>
            <Separator className="mb-8" />
            <CardContent className="space-y-4">
              <CategoryForm
                initialData={post}
                postId={post.id}
                options={categories}
              />
            </CardContent>
          </Card>

          {/* Cover Image */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>{protectedEditorConfig.coverImageTitle}</CardTitle>
              <CardDescription>
                {protectedEditorConfig.coverImageDescription}
              </CardDescription>
            </CardHeader>
            <Separator className="mb-8" />
            <CardContent className="space-y-4">
              <ImageForm initialData={post} postId={post.id} />
            </CardContent>
          </Card>

          {/* Short Description */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>
                {protectedEditorConfig.shortDescriptionTitle}
              </CardTitle>
              <CardDescription>
                {protectedEditorConfig.shortDescriptionDescription}
              </CardDescription>
            </CardHeader>
            <Separator className="mb-8" />
            <CardContent className="space-y-4">
              <DescriptionForm initialData={post} postId={post.id} />
            </CardContent>
          </Card>

          {/* Language Tabs */}
          <Tabs
            value={activeLanguage}
            onValueChange={(value) => {
              if (value === "en" || value === "ar") {
                setActiveLanguage(value);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ar">العربية</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* WYSIWYG Editor */}
          {activeLanguage === "en" ? (
            <WysiwygEditor
              defaultValue={
                contentEN ? JSON.parse(contentEN) : defaultEditorContent
              }
              onDebouncedUpdate={(editor) => {
                setContentEN(JSON.stringify(editor?.getJSON()));
              }}
            />
          ) : (
            <WysiwygEditor
              defaultValue={
                contentAR ? JSON.parse(contentAR) : defaultEditorContent
              }
              onDebouncedUpdate={(editor) => {
                setContentAR(JSON.stringify(editor?.getJSON()));
              }}
            />
          )}

          {/* Form submission buttons */}
          <div className="inline-flex items-center justify-start gap-x-3">
            <Button
              type="submit"
              className="flex !bg-gray-900 px-10 !text-white hover:!bg-gray-800"
              disabled={isSaving}
            >
              {protectedEditorConfig.submit}
            </Button>
            <Button
              type="button"
              onClick={onDelete}
              className="flex !bg-gray-900 px-10 !text-white hover:!bg-gray-800"
              disabled={isSaving}
            >
              {protectedEditorConfig.delete}
            </Button>
            <Button
              type="button"
              onClick={() => router.back()}
              className="flex !bg-gray-100 px-10 !text-gray-900 hover:!bg-gray-200"
              disabled={isSaving}
            >
              {protectedEditorConfig.cancel}
            </Button>
          </div>
        </form>
      </Form>

      {/* Loading Alert Dialog */}
      <AlertDialog open={showLoadingAlert} onOpenChange={setShowLoadingAlert}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              {protectedPostConfig.pleaseWait}
            </AlertDialogTitle>
            <AlertDialogDescription className="mx-auto text-center">
              <SpinnerIcon className="h-6 w-6 animate-spin" />
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BlogEditor;
