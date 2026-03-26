'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formSchema = z.object({
  name: z.string().min(1, 'اسم القسم مطلوب').max(50, 'اسم القسم طويل جداً'),
  description: z.string().max(500, 'الوصف طويل جداً').optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().optional(),
  name_en: z.string().max(50).optional(),
  description_en: z.string().max(500).optional(),
  name_fr: z.string().max(50).optional(),
  description_fr: z.string().max(500).optional(),
  name_tr: z.string().max(50).optional(),
  description_tr: z.string().max(500).optional(),
  name_id: z.string().max(50).optional(),
  description_id: z.string().max(500).optional(),
  name_pt: z.string().max(50).optional(),
  description_pt: z.string().max(500).optional(),
  name_es: z.string().max(50).optional(),
  description_es: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Category {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  campaigns: {
    id: string;
  }[];
  order: number; // Add this line
}

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      image: '',
      icon: '',
      order: 0,
      name_en: '',
      description_en: '',
      name_fr: '',
      description_fr: '',
      name_tr: '',
      description_tr: '',
      name_id: '',
      description_id: '',
      name_pt: '',
      description_pt: '',
      name_es: '',
      description_es: '',
    },
  });

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const response = await axios.get(`/api/categories/${params.id}?allTranslations=true`);
        const category = response.data;
        const getTr = (locale: string) => category.translations?.find((t: { locale: string }) => t.locale === locale);
        const en = getTr('en'); const fr = getTr('fr'); const tr = getTr('tr'); const id = getTr('id'); const pt = getTr('pt'); const es = getTr('es');
        form.reset({
          name: category.name || '',
          description: category.description || '',
          image: category.image || '',
          icon: category.icon || '',
          order: category.order ?? 0,
          name_en: en?.name || '', description_en: en?.description || '',
          name_fr: fr?.name || '', description_fr: fr?.description || '',
          name_tr: tr?.name || '', description_tr: tr?.description || '',
          name_id: id?.name || '', description_id: id?.description || '',
          name_pt: pt?.name || '', description_pt: pt?.description || '',
          name_es: es?.name || '', description_es: es?.description || '',
        });
      } catch (error) {
        console.error('Error fetching category:', error);
        toast.error('فشل في تحميل بيانات القسم');
        router.push('/dashboard/categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [params.id, form, router]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await axios.put(`/api/categories/${params.id}`, {
        name: values.name,
        description: values.description,
        image: values.image,
        icon: values.icon,
        order: values.order,
        translations: {
          en: { name: values.name_en ?? '', description: values.description_en ?? '' },
          fr: { name: values.name_fr ?? '', description: values.description_fr ?? '' },
          tr: { name: values.name_tr ?? '', description: values.description_tr ?? '' },
          id: { name: values.name_id ?? '', description: values.description_id ?? '' },
          pt: { name: values.name_pt ?? '', description: values.description_pt ?? '' },
          es: { name: values.name_es ?? '', description: values.description_es ?? '' },
        },
      });
      toast.success('تم تحديث القسم بنجاح');
      router.push('/dashboard/categories');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('فشل في تحديث القسم');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">تعديل القسم</h1>
          <p className="text-gray-600">قم بتحديث معلومات القسم</p>
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
          <Tabs defaultValue="ar" className="w-full">
            <TabsList className="flex flex-wrap gap-1 mb-4" dir="rtl">
              <TabsTrigger value="ar">العربية</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="fr">Français</TabsTrigger>
              <TabsTrigger value="tr">Türkçe</TabsTrigger>
              <TabsTrigger value="id">Bahasa</TabsTrigger>
              <TabsTrigger value="pt">Português</TabsTrigger>
              <TabsTrigger value="es">Español</TabsTrigger>
            </TabsList>
            <TabsContent value="ar" className="mt-0">
              <Card className="p-6">
                <div className="grid gap-6">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>اسم القسم</FormLabel><FormControl><Input {...field} placeholder="أدخل اسم القسم" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>وصف القسم</FormLabel><FormControl><Textarea placeholder="اكتب وصفاً للقسم..." className="resize-y" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="en" className="mt-0">
              <Card className="p-6">
                <div className="grid gap-6">
                  <FormField control={form.control} name="name_en" render={({ field }) => (
                    <FormItem><FormLabel>Category name (English)</FormLabel><FormControl><Input {...field} placeholder="Category name" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description_en" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Description..." className="resize-y" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="fr" className="mt-0">
              <Card className="p-6">
                <div className="grid gap-6">
                  <FormField control={form.control} name="name_fr" render={({ field }) => (
                    <FormItem><FormLabel>Nom (français)</FormLabel><FormControl><Input {...field} placeholder="Nom de la catégorie" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description_fr" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Description..." className="resize-y" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="tr" className="mt-0">
              <Card className="p-6">
                <div className="grid gap-6">
                  <FormField control={form.control} name="name_tr" render={({ field }) => (
                    <FormItem><FormLabel>Kategori adı (Türkçe)</FormLabel><FormControl><Input {...field} placeholder="Kategori adı" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description_tr" render={({ field }) => (
                    <FormItem><FormLabel>Açıklama</FormLabel><FormControl><Textarea placeholder="Açıklama..." className="resize-y" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="id" className="mt-0">
              <Card className="p-6">
                <div className="grid gap-6">
                  <FormField control={form.control} name="name_id" render={({ field }) => (
                    <FormItem><FormLabel>Nama kategori (Indonesia)</FormLabel><FormControl><Input {...field} placeholder="Nama kategori" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description_id" render={({ field }) => (
                    <FormItem><FormLabel>Deskripsi</FormLabel><FormControl><Textarea placeholder="Deskripsi..." className="resize-y" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="pt" className="mt-0">
              <Card className="p-6">
                <div className="grid gap-6">
                  <FormField control={form.control} name="name_pt" render={({ field }) => (
                    <FormItem><FormLabel>Nome da categoria (Português)</FormLabel><FormControl><Input {...field} placeholder="Nome da categoria" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description_pt" render={({ field }) => (
                    <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descrição..." className="resize-y" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="es" className="mt-0">
              <Card className="p-6">
                <div className="grid gap-6">
                  <FormField control={form.control} name="name_es" render={({ field }) => (
                    <FormItem><FormLabel>Nombre de categoría (Español)</FormLabel><FormControl><Input {...field} placeholder="Nombre de la categoría" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description_es" render={({ field }) => (
                    <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Descripción..." className="resize-y" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="p-6">
            <div className="grid gap-6">

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
              حفظ التغييرات
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 