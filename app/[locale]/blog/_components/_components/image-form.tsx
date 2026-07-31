"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ImageIcon, Pencil, Globe, Loader2, X, Upload } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Post } from "@prisma/client";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form } from "@/components/ui/form";
import {
  cleanupManagedDashboardMediaAfterSave,
  deleteUnsavedDashboardMedia,
  markDashboardAssetPersisted,
  uploadDashboardMedia,
} from "@/lib/media/client";

interface ImageFormProps {
  initialData: Post;
  postId: string;
}

const ImageForm: React.FC<ImageFormProps> = ({ initialData, postId }) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("ar");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [removedPersisted, setRemovedPersisted] = useState<string[]>([]);

  const toggleEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsEditing((current) => !current);
  };

  const formSchema = z.object({
    imageAR: z.string().min(1, { message: "الصورة بالعربية مطلوبة" }),
    imageEN: z.string().min(1, { message: "English image is required" }),
  });

  const mappedInitialData = {
    imageAR: initialData?.imageAR || "",
    imageEN: initialData?.imageEN || "",
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: mappedInitialData,
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const payload: any = { image: values.imageAR };
      if (values.imageEN) payload.translations = { en: { image: values.imageEN } };
      await axios.patch(`/api/posts/${postId}`, payload);
      if (values.imageAR) markDashboardAssetPersisted(values.imageAR);
      if (values.imageEN) markDashboardAssetPersisted(values.imageEN);
      await Promise.all(removedPersisted.map((url) => cleanupManagedDashboardMediaAfterSave(url, "blog").catch(() => false)));
      setRemovedPersisted([]);
      toast.success("تم تحديث معلومات المقال");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update the blog", error);
      toast.error("حدث خطأ");
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "imageAR" | "imageEN") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const asset = await uploadDashboardMedia(file, "blog");
      form.setValue(field, asset.url);
      toast.success("تم رفع الصورة بنجاح");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("فشل في رفع الصورة");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async (field: "imageAR" | "imageEN") => {
    const imageUrl = form.getValues(field);
    if (!imageUrl) return;
    const deletedUnsaved = await deleteUnsavedDashboardMedia(imageUrl, "blog").catch(() => false);
    if (!deletedUnsaved && Object.values(mappedInitialData).includes(imageUrl)) {
      setRemovedPersisted((current) => current.includes(imageUrl) ? current : [...current, imageUrl]);
    }
    form.setValue(field, "");
    toast.success("تم فصل الصورة. سيتم حفظ التغيير عند التأكيد");
  };

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-6">
      <div className="font-medium flex items-center justify-between">
        الصورة المصغرة{" "}
        <Button variant="ghost" onClick={toggleEdit}>
          {isEditing ? <>إلغاء</> : <><Pencil className="h-4 w-4 ml-2" />تعديل الصورة</>}
        </Button>
      </div>
      {!isEditing ? (
        <Tabs defaultValue="ar" className="mt-2">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="en" className="flex items-center gap-1"><span>English</span></TabsTrigger>
            <TabsTrigger value="ar" className="flex items-center gap-1"><span>عربي</span></TabsTrigger>
          </TabsList>
          <TabsContent value="ar" className="mt-2">
            <div className="relative aspect-video mt-2">
              {initialData?.imageAR || initialData?.image ? (
                <Image alt="صورة المقال بالعربية" fill className="object-cover rounded-md" src={initialData?.imageAR || initialData?.image} />
              ) : (
                <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md"><ImageIcon className="h-10 w-10 text-slate-500" /></div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="en" className="mt-2">
            <div className="relative aspect-video mt-2">
              {initialData?.imageEN ? (
                <Image alt="Article image in English" fill className="object-cover rounded-md" src={initialData?.imageEN} />
              ) : (
                <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md"><ImageIcon className="h-10 w-10 text-slate-500" /></div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Form {...form}>
          <div className="space-y-4 mt-4 w-full">
            <Tabs defaultValue="ar" onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="en" className="flex items-center gap-1"><span>English</span></TabsTrigger>
                <TabsTrigger value="ar" className="flex items-center gap-1"><span>عربي</span></TabsTrigger>
              </TabsList>
              {(["imageAR", "imageEN"] as const).map((field) => {
                const isArabic = field === "imageAR";
                return (
                  <TabsContent key={field} value={isArabic ? "ar" : "en"} className="mt-2">
                    <div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleImageUpload(e, field)}
                        className="hidden"
                        id={field}
                        disabled={uploadingImage}
                      />
                      <label htmlFor={field} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
                        {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : <><Upload className="w-6 h-6 text-gray-400" /><span className="mt-2 text-sm text-gray-500">{isArabic ? "اضغط لإضافة صورة بالعربية" : "اضغط لإضافة صورة بالإنجليزية"}</span></>}
                      </label>
                      {form.getValues(field) && (
                        <div className="relative mt-4">
                          <img src={form.getValues(field)} alt={isArabic ? "صورة المقال بالعربية" : "Article image in English"} className="w-full h-32 object-cover rounded-lg" />
                          <button type="button" onClick={() => removeImage(field)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-4">{isArabic ? "ننصح باستخدام نسبة العرض إلى الارتفاع 16:9" : "Recommended aspect ratio is 16:9"}</div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
            <div className="flex items-center gap-x-2">
              <Button type="button" onClick={() => onSubmit(form.getValues())} disabled={isSubmitting} className="flex items-center gap-2">
                <Globe className="h-4 w-4" />{activeTab === "ar" ? "تأكيد" : "Confirm"}
              </Button>
            </div>
          </div>
        </Form>
      )}
    </div>
  );
};

export default ImageForm;
