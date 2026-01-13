"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Pencil, Globe, Languages } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Textarea } from "@/components/ui/textarea";
import { Post } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DescriptionFormProps {
  initialData: Post;
  postId: string;
}

const DescriptionForm: React.FC<DescriptionFormProps> = ({
  initialData,
  postId,
}) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("ar");

  const toggleEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsEditing((current) => !current);
  };

  const formSchema = z.object({
    descriptionAR: z.string().min(1, {
      message: "الوصف بالعربية مطلوب",
    }),
    descriptionEN: z.string().min(1, {
      message: "English description is required",
    }),
  });

  // Map initial data to new structure
  const mappedInitialData = {
    descriptionAR: initialData?.descriptionAR || initialData?.description || "",
    descriptionEN: initialData?.descriptionEN || "",
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: mappedInitialData,
  });

  const { isSubmitting, isValid } = form.formState;

  async function onSubmit() {
    const values = form.getValues();
    try {
      await axios.patch(`/api/posts/${postId}`, values);
      toast.success("تم تحديث معلومات المقال");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update the blog", error);
      toast.error("حدث خطأ");
    }
  }

  const displayDescription = (language: string) => {
    if (language === "ar") {
      return initialData?.descriptionAR || initialData?.description || "لا يوجد وصف بالعربية";
    }
    return initialData?.descriptionEN || "No English description available";
  };

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-6">
      <div className="font-medium flex items-center justify-between">
        وصف المقال{" "}
        <Button variant="ghost" onClick={toggleEdit}>
          {isEditing ? (
            <>الغاء</>
          ) : (
            <>
              <Pencil className="h-4 w-4 ml-2" />
              تعديل
            </>
          )}
        </Button>
      </div>
      {!isEditing ? (
        <Tabs defaultValue="ar" className="mt-2">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="en" className="flex items-center gap-1">
              <span>English</span>
            </TabsTrigger>
            <TabsTrigger value="ar" className="flex items-center gap-1">
              <span>عربي</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ar" className="mt-2">
            <div className="p-3 bg-slate-50 rounded-md" dir="rtl">
              {displayDescription("ar")}
            </div>
          </TabsContent>
          <TabsContent value="en" className="mt-2">
            <div className="p-3 bg-slate-50 rounded-md">
              {displayDescription("en")}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Form {...form}>
          <div className="space-y-4 mt-4 w-full">
            <Tabs defaultValue="ar" onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="en" className="flex items-center gap-1">
                  <span>English</span>
                </TabsTrigger>
                <TabsTrigger value="ar" className="flex items-center gap-1">
                  <span>عربي</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="ar" className="mt-2">
                <div dir="rtl">
                  <FormField
                    control={form.control}
                    name="descriptionAR"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            disabled={isSubmitting}
                            placeholder="وصف المقال بالعربية"
                            className="text-right"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-right">
                          صف المقال الخاصة بك بشكل ملخص و مفيد
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              <TabsContent value="en" className="mt-2">
                <FormField
                  control={form.control}
                  name="descriptionEN"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          disabled={isSubmitting}
                          placeholder="Article description in English"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a brief and useful description of your article
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            <div className="flex items-center gap-x-2">
              <Button
                type="button"
                onClick={onSubmit}
                disabled={!isValid || isSubmitting}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                {activeTab === "ar" ? "تأكيد" : "Confirm"}
              </Button>
            </div>
          </div>
        </Form>
      )}
    </div>
  );
};

export default DescriptionForm;