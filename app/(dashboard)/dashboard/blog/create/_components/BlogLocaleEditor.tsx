"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import * as z from "zod";
import { Loader2 as SpinnerIcon, Upload, X } from "lucide-react";
import Image from "next/image";
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
import WysiwygEditor from "@/app/[locale]/blog/_components/wysiwyg/wysiwyg-editor";
import { defaultEditorContent } from "@/app/[locale]/blog/_components/wysiwyg/default-content";

const schema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
});

const config = {
  save: "حفظ",
  cancel: "إلغاء",
  success: "تم تحديث الترجمة بنجاح",
  error: "فشل تحديث الترجمة",
  pleaseWait: "برجاء الانتظار ...",
  generalTitle: "محتوى الترجمة",
  generalDescription: "عدّل العنوان والوصف والمحتوى لهذه اللغة",
  titleLabel: "العنوان",
  descriptionLabel: "الوصف المختصر",
  imageLabel: "رابط الصورة",
};

type Locale = "en" | "fr";

interface BlogLocaleEditorProps {
  post: {
    id: string;
    translations?: Array<{
      locale: string;
      title?: string | null;
      description?: string | null;
      content?: string | null;
      image?: string | null;
    }>;
  };
  locale: Locale;
}

export default function BlogLocaleEditor({ post, locale }: BlogLocaleEditorProps) {
  const router = useRouter();
  const trans = post.translations?.find((t) => t.locale === locale);

  const [isSaving, setIsSaving] = useState(false);
  const [showLoadingAlert, setShowLoadingAlert] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [content, setContent] = useState<string | null>(
    trans?.content ?? null
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: trans?.title ?? "",
      description: trans?.description ?? "",
      image: trans?.image ?? "",
    },
    mode: "onChange",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("/api/upload", formData);
      form.setValue("image", response.data?.url ?? "");
      toast.success(config.success);
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error(config.error);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    const current = form.getValues("image");
    if (current) {
      axios.delete(`/api/upload?publicId=${current.split("/").slice(-1)[0].split(".")[0]}`).catch(() => {});
    }
    form.setValue("image", "");
  };

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setShowLoadingAlert(true);
    setIsSaving(true);
    try {
      await axios.patch(`/api/posts/${post.id}`, {
        translations: {
          [locale]: {
            title: data.title || undefined,
            description: data.description || undefined,
            content: content || undefined,
            image: data.image || undefined,
          },
        },
      });
      toast.success(config.success);
      router.refresh();
    } catch (err) {
      console.error("Post translation update error:", err);
      toast.error(config.error);
    } finally {
      setIsSaving(false);
      setShowLoadingAlert(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="">
          <CardHeader dir="rtl">
              <CardTitle>{config.generalTitle}</CardTitle>
              <CardDescription>{config.generalDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{config.titleLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{config.descriptionLabel}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Description" rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{config.imageLabel}</FormLabel>
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
                              id={`blog-locale-image-${locale}`}
                              disabled={uploadingImage}
                            />
                            <label
                              htmlFor={`blog-locale-image-${locale}`}
                              className={`flex flex-col items-center justify-center h-32 w-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors ${uploadingImage ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              {uploadingImage ? (
                                <SpinnerIcon className="w-6 h-6 animate-spin text-emerald-600" />
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 text-gray-400" />
                                  <span className="mt-2 text-sm text-gray-500">
                                    اضغط لرفع الصورة
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
            </CardContent>
          </Card>

          <Card className="">
          <CardHeader dir="rtl">
              <CardTitle>المحتوى</CardTitle>
              <CardDescription>محتوى المقال بهذه اللغة</CardDescription>
            </CardHeader>
            <CardContent>
              <WysiwygEditor
                defaultValue={
                  (() => {
                    if (!content) return defaultEditorContent;
                    try {
                      return JSON.parse(content);
                    } catch {
                      return defaultEditorContent;
                    }
                  })()
                }
                onDebouncedUpdate={(editor) => {
                  setContent(JSON.stringify(editor?.getJSON()));
                }}
              />
            </CardContent>
          </Card>

          <div className="inline-flex items-center gap-3">
            <Button
              type="submit"
              className="!bg-gray-900 px-10 !text-white hover:!bg-gray-800"
              disabled={isSaving}
            >
              {config.save}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              {config.cancel}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showLoadingAlert} onOpenChange={setShowLoadingAlert}>
        <AlertDialogContent className="font-sans">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              {config.pleaseWait}
            </AlertDialogTitle>
            <AlertDialogDescription className="mx-auto text-center">
              <SpinnerIcon className="h-6 w-6 animate-spin" />
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
