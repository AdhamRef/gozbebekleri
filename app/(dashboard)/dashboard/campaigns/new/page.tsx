'use client';

import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  ArrowLeft, 
  X, 
  Upload, 
  Languages, 
  AlertCircle,
  CheckCircle2,
  Globe 
} from 'lucide-react';
import { useLocale } from 'next-intl';

// ✅ Enhanced schema with translations
const formSchema = z.object({
  // Arabic (required)
  title: z.string()
    .min(1, 'العنوان مطلوب')
    .max(100, 'العنوان طويل جداً'),
  description: z.string()
    .min(1, 'الوصف مطلوب')
    .max(10000, 'الوصف طويل جداً'),
  targetAmount: z.number()
    .min(1, 'المبلغ المستهدف مطلوب')
    .max(1000000, 'المبلغ المستهدف كبير جداً'),
  categoryId: z.string()
    .min(1, 'القسم مطلوب'),
  isActive: z.boolean(),
  images: z.array(z.string())
    .min(1, 'صورة واحدة على الأقل مطلوبة')
    .max(5, 'الحد الأقصى 5 صور'),
  videoUrl: z.string().optional(),
  
  // English translations (optional)
  title_en: z.string().optional(),
  description_en: z.string().optional(),
  
  // French translations (optional)
  title_fr: z.string().optional(),
  description_fr: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Category {
  id: string;
  name: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const locale = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'ar' | 'en' | 'fr'>('ar');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      targetAmount: 0,
      categoryId: '',
      isActive: true,
      images: [],
      videoUrl: '',
      title_en: '',
      description_en: '',
      title_fr: '',
      description_fr: '',
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories', {
          params: {
            locale: "ar",
            counts: true,
            limit: 200,
          },
          headers: {
            'x-locale': locale,
          },
        });
        setCategories(response.data.items);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('فشل في تحميل الأقسام');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [locale]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      // ✅ Prepare request with translations
      const requestData = {
        title: values.title,
        description: values.description,
        targetAmount: values.targetAmount,
        categoryId: values.categoryId,
        isActive: values.isActive,
        images: values.images,
        videoUrl: values.videoUrl,
        
        // Only include translations if they have content
        translations: {
          ...(values.title_en && values.description_en ? {
            en: {
              title: values.title_en,
              description: values.description_en,
            }
          } : {}),
          ...(values.title_fr && values.description_fr ? {
            fr: {
              title: values.title_fr,
              description: values.description_fr,
            }
          } : {}),
        },
      };

      await axios.post('/api/campaigns', requestData);
      toast.success('تم إنشاء الحملة بنجاح');
      router.push('/dashboard/campaigns');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('فشل في إنشاء الحملة');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentImages = form.getValues('images');
    if (currentImages.length + files.length > 5) {
      toast.error('الحد الأقصى 5 صور');
      return;
    }

    setUploadingImage(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post('/api/upload', formData);
        return response.data.url;
      } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
      }
    });

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      form.setValue('images', [...currentImages, ...uploadedUrls]);
      toast.success('تم رفع الصور بنجاح');
    } catch (error) {
      toast.error('فشل في رفع الصور');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async (index: number) => {
    try {
      const currentImages = form.getValues('images');
      const imageUrl = currentImages[index];
      
      const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
      if (publicId) {
        await axios.delete(`/api/upload?publicId=${publicId}`);
      }
      
      const newImages = currentImages.filter((_, i) => i !== index);
      form.setValue('images', newImages);
      toast.success('تم حذف الصورة بنجاح');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('فشل في حذف الصورة');
    }
  };

  // ✅ Check translation completeness
  const getTranslationStatus = () => {
    const hasEn = !!form.watch('title_en') && !!form.watch('description_en');
    const hasFr = !!form.watch('title_fr') && !!form.watch('description_fr');
    const completed = [hasEn, hasFr].filter(Boolean).length;
    
    return { completed, total: 2, hasEn, hasFr };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const translationStatus = getTranslationStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إنشاء حملة جديدة</h1>
          <p className="text-gray-600">قم بإدخال معلومات الحملة</p>
          
          {/* ✅ Translation Status Badge */}
          <div className="flex items-center gap-2 mt-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              الترجمات: {translationStatus.completed}/{translationStatus.total}
            </span>
            {translationStatus.hasEn && (
              <CheckCircle2 className="w-4 h-4 text-green-600" title="English ready" />
            )}
            {translationStatus.hasFr && (
              <CheckCircle2 className="w-4 h-4 text-blue-600" title="French ready" />
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/campaigns')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ✅ Multi-Language Tabs for Campaign Content */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Languages className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold">المعلومات الأساسية</h2>
            </div>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="ar" className="gap-2">
                  🇸🇦 العربية
                  <span className="text-xs text-red-600">*</span>
                </TabsTrigger>
                <TabsTrigger value="en" className="gap-2">
                  🇬🇧 English
                  {translationStatus.hasEn && (
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="fr" className="gap-2">
                  🇫🇷 Français
                  {translationStatus.hasFr && (
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Arabic Tab */}
              <TabsContent value="ar" className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem dir='rtl'>
                        <FormLabel>القسم *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر القسم" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
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
                    name="title"
                    render={({ field }) => (
                      <FormItem dir='rtl'>
                        <FormLabel>عنوان الحملة *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="أدخل عنوان الحملة" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem dir='rtl'>
                      <FormLabel>وصف الحملة *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="اكتب وصفاً تفصيلياً للحملة..."
                          className="min-h-[200px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        قدم وصفاً شاملاً للحملة وأهدافها
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* English Tab */}
              <TabsContent value="en" className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className='mt-[5px]'>
                    English translations are optional. If not provided, Arabic content will be displayed to English users.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="title_en"
                  render={({ field }) => (
                    <FormItem dir='rtl'>
                      <FormLabel>Campaign Title (English)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter campaign title in English" />
                      </FormControl>
                      <FormDescription>
                        Provide an English translation of the campaign title
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description_en"
                  render={({ field }) => (
                    <FormItem dir='rtl'>
                      <FormLabel>Campaign Description (English)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write detailed campaign description in English..."
                          className="min-h-[200px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a comprehensive English description of the campaign and its goals
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Helper for partial translations */}
                {(form.watch('title_en') || form.watch('description_en')) && 
                 (!form.watch('title_en') || !form.watch('description_en')) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className='mt-[5px]'>
                      Both title and description must be provided for English translation to be saved.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* French Tab */}
              <TabsContent value="fr" className="space-y-6">
                <Alert className='flex items-center'>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className='mt-[5px]'>
                    Les traductions françaises sont facultatives. Si elles ne sont pas fournies, le contenu arabe sera affiché aux utilisateurs français.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="title_fr"
                  render={({ field }) => (
                    <FormItem dir='rtl'>
                      <FormLabel>Titre de la campagne (Français)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Entrez le titre de la campagne en français" />
                      </FormControl>
                      <FormDescription>
                        Fournissez une traduction française du titre de la campagne
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description_fr"
                  render={({ field }) => (
                    <FormItem dir='rtl'>
                      <FormLabel>Description de la campagne (Français)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Rédigez une description détaillée de la campagne en français..."
                          className="min-h-[200px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Fournissez une description complète en français de la campagne et de ses objectifs
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {/* Helper for partial translations */}
                {(form.watch('title_fr') || form.watch('description_fr')) && 
                 (!form.watch('title_fr') || !form.watch('description_fr')) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className='mt-[5px]'>
                      Le titre et la description doivent être fournis pour que la traduction française soit enregistrée.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Campaign Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">إعدادات الحملة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem dir='rtl'>
                    <FormLabel>المبلغ المستهدف *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="أدخل المبلغ المستهدف"
                      />
                    </FormControl>
                    <FormDescription>
                      المبلغ الإجمالي المطلوب للحملة بالدولار
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem dir='rtl'>
                    <FormLabel>رابط الفيديو (اختياري)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="أدخل رابط الفيديو (YouTube أو Vimeo)"
                      />
                    </FormControl>
                    <FormDescription>
                      رابط فيديو توضيحي للحملة
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Images */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem dir='rtl'>
                  <FormLabel>صور الحملة *</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {field.value.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`صورة ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            {index === 0 && (
                              <div className="absolute bottom-2 left-2 px-2 py-1 bg-emerald-600 text-white text-xs rounded">
                                صورة رئيسية
                              </div>
                            )}
                          </div>
                        ))}
                        {field.value.length < 5 && (
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              className="hidden"
                              id="images"
                              disabled={uploadingImage}
                            />
                            <label
                              htmlFor="images"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors"
                            >
                              {uploadingImage ? (
                                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 text-gray-400" />
                                  <span className="mt-2 text-sm text-gray-500">
                                    اضغط لإضافة صور
                                  </span>
                                </>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                      <FormDescription>
                        يمكنك رفع حتى 5 صور للحملة. الصورة الأولى ستكون الصورة الرئيسية المعروضة.
                      </FormDescription>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>

          {/* Status */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>حالة الحملة</FormLabel>
                    <FormDescription>
                      تحديد ما إذا كانت الحملة نشطة ومرئية للمستخدمين فور الإنشاء
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </Card>

          {/* ✅ Translation Summary */}
          {(translationStatus.hasEn || translationStatus.hasFr) && (
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">ملخص الترجمات</h3>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p>✓ المحتوى العربي: مكتمل (مطلوب)</p>
                    {translationStatus.hasEn && (
                      <p>✓ الترجمة الإنجليزية: مكتملة</p>
                    )}
                    {translationStatus.hasFr && (
                      <p>✓ الترجمة الفرنسية: مكتملة</p>
                    )}
                    {!translationStatus.hasEn && (
                      <p className="text-blue-600">○ الترجمة الإنجليزية: غير مكتملة (اختياري)</p>
                    )}
                    {!translationStatus.hasFr && (
                      <p className="text-blue-600">○ الترجمة الفرنسية: غير مكتملة (اختياري)</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/campaigns')}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              إنشاء الحملة
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}