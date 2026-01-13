'use client';

import { useState } from 'react';
import { useRouter } from "@/i18n/routing";
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react';

const formSchema = z.object({
  name: z.string()
    .min(1, 'اسم القسم مطلوب')
    .max(50, 'اسم القسم طويل جداً'),
  description: z.string()
    .max(500, 'الوصف طويل جداً')
    .optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewCategoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      image: '',
      icon: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await axios.post('/api/categories', values);
      toast.success('تم إنشاء القسم بنجاح');
      router.push('/dashboard/categories');
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('فشل في إنشاء القسم');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData);
      form.setValue('image', response.data.url);
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('فشل في رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async () => {
    const imageUrl = form.getValues('image');
    if (!imageUrl) return;

    try {
      const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
      if (publicId) {
        await axios.delete(`/api/upload?publicId=${publicId}`);
      }
      form.setValue('image', '');
      toast.success('تم حذف الصورة بنجاح');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('فشل في حذف الصورة');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إنشاء قسم جديد</h1>
          <p className="text-gray-600">قم بإدخال معلومات القسم</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/categories')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="p-6">
            <div className="grid gap-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم القسم</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل اسم القسم" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وصف القسم</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="اكتب وصفاً للقسم..."
                        className="resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image */}
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>صورة القسم</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {field.value ? (
                          <div className="relative w-40 h-40">
                            <img
                              src={field.value}
                              alt="Category"
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="image"
                              disabled={uploadingImage}
                            />
                            <label
                              htmlFor="image"
                              className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors"
                            >
                              {uploadingImage ? (
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 text-gray-400" />
                                  <span className="mt-2 text-sm text-gray-500">
                                    اضغط لإضافة صورة
                                  </span>
                                </>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      يمكنك رفع صورة واحدة للقسم
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Icon */}
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>أيقونة SVG</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="<svg>...</svg>"
                        className="resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      أدخل كود SVG الخاص بالأيقونة هنا
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/categories')}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              إنشاء القسم
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 