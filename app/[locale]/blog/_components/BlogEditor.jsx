"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import * as z from "zod";

import { Loader2, SpinnerIcon, Upload, X } from "lucide-react";
import Image from "next/image";

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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Custom components and config
import WysiwygEditor from "./wysiwyg/wysiwyg-editor";
import { defaultEditorContent } from "./wysiwyg/default-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Validation schema (Arabic fields only - simple inputs like BlogLocaleEditor)
const postEditFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.string().optional(),
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

const BlogEditor = ({ post, userId, categories, redirectAfterCreate, isCreate: isCreateProp }) => {
  const router = useRouter();
  const isCreate = isCreateProp || !post?.id || post.id === "new";


  // States
  const [isSaving, setIsSaving] = useState(false);
  const [showLoadingAlert, setShowLoadingAlert] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Arabic content only (en/fr edited in BlogLocaleEditor)
  const [contentAR, setContentAR] = useState(post?.contentAR || null);


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

  // Form setup (simple inputs like BlogLocaleEditor)
  const defaultValues = {
    title: post?.titleAR || post?.title || "",
    description: post?.descriptionAR || post?.description || "",
    image: post?.imageAR || post?.image || "",
    categoryId: post?.category_id || post?.categoryId || "",
  };

  const form = useForm({
    resolver: zodResolver(postEditFormSchema),
    defaultValues,
    mode: "onChange",
  });

  // Submit handler: Arabic fields only (en/fr edited in BlogLocaleEditor)
  const onSubmit = async (data) => {
    setShowLoadingAlert(true);
    setIsSaving(true);

    try {
      const payload = {
        title: data.title,
        description: data.description || "",
        content: contentAR || "",
        image: data.image || "",
        categoryId: data.categoryId || null,
      };

      let response;
      if (isCreate) {
        response = await axios.post("/api/posts", payload);
        toast.success(protectedEditorConfig.successMessage);
        if (redirectAfterCreate) {
          router.push(`${redirectAfterCreate}/${response.data.id}`);
        } else {
          router.push(`/blog/${response.data.id}`);
        }
      } else {
        response = await axios.patch(`/api/posts/${post.id}`, payload);
        toast.success(protectedEditorConfig.successMessage);
        router.push(`/blog/${response.data.id}`);
      }
    } catch (error) {
      console.error(isCreate ? "Post create error:" : "Post update error:", error);
      toast.error(protectedEditorConfig.errorMessage);
    } finally {
      setIsSaving(false);
      setShowLoadingAlert(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("/api/upload", formData);
      form.setValue("image", response.data.url || "");
      toast.success(protectedEditorConfig.successMessageImageUpload);
    } catch (err) {
      console.error("Error uploading image:", err);
      toast.error(protectedEditorConfig.errorMessageImageUpload);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async () => {
    const current = form.getValues("image");
    if (current) {
      try {
        const publicId = current.split("/").slice(-1)[0].split(".")[0];
        if (publicId) await axios.delete(`/api/upload?publicId=${publicId}`);
      } catch (err) {
        console.error("Error removing image:", err);
      }
    }
    form.setValue("image", "");
    toast.success("تم حذف الصورة بنجاح");
  };

  // Delete handler (only when editing)
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
      <Form {...form} dir="rtl">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Single card with simple inputs like BlogLocaleEditor */}
          <Card className="">
            <CardHeader dir="rtl">
              <CardTitle>{protectedEditorConfig.generalTitle}</CardTitle>
              <CardDescription>
                {protectedEditorConfig.generalDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem dir="rtl">
                    <FormLabel>{protectedEditorConfig.formTitle} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={protectedEditorConfig.placeHolderTitle}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem dir="rtl">
                    <FormLabel>{protectedEditorConfig.categoryTitle}</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      dir="rtl"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={protectedEditorConfig.categoryDescription} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(categories || []).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem dir="rtl">
                    <FormLabel>{protectedEditorConfig.coverImageTitle}</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {field.value ? (
                          <div className="relative group">
                            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                              <Image
                                src={field.value}
                                alt="Cover"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 640px"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="blog-cover-upload"
                              disabled={uploadingImage}
                            />
                            <label
                              htmlFor="blog-cover-upload"
                              className={`flex flex-col items-center justify-center h-32 w-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors ${uploadingImage ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              {uploadingImage ? (
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 text-gray-400" />
                                  <span className="mt-2 text-sm text-gray-500">
                                    اضغط لرفع الصورة الرئيسية
                                  </span>
                                </>
                              )}
                            </label>
                          </>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem dir="rtl">
                    <FormLabel>{protectedEditorConfig.shortDescriptionTitle}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={protectedEditorConfig.placeholderDescription}
                        className="min-h-[160px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Content - single WYSIWYG for Arabic (no inner lang tabs) */}
          <Card className="">
          <CardHeader dir="rtl">
              <CardTitle>المحتوى</CardTitle>
              <CardDescription>{protectedEditorConfig.placeholderContent}</CardDescription>
            </CardHeader>
            <CardContent>
              <WysiwygEditor
                defaultValue={(() => {
                  if (!contentAR) return defaultEditorContent;
                  try {
                    return typeof contentAR === "string" ? JSON.parse(contentAR) : contentAR;
                  } catch {
                    return defaultEditorContent;
                  }
                })()}
                onDebouncedUpdate={(editor) => {
                  setContentAR(JSON.stringify(editor?.getJSON()));
                }}
              />
            </CardContent>
          </Card>

          {/* Form submission buttons */}
          <div className="inline-flex items-center justify-start gap-x-3">
            <Button
              type="submit"
              className="flex !bg-gray-900 px-10 !text-white hover:!bg-gray-800"
              disabled={isSaving}
            >
              {isCreate ? "إنشاء" : protectedEditorConfig.submit}
            </Button>
            {!isCreate && (
              <Button
                type="button"
                onClick={onDelete}
                className="flex !bg-gray-900 px-10 !text-white hover:!bg-gray-800"
                disabled={isSaving}
              >
                {protectedEditorConfig.delete}
              </Button>
            )}
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
              <Loader2 className="h-6 w-6 animate-spin" />
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BlogEditor;
