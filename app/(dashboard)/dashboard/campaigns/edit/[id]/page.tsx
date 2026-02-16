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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Loader2, 
  ArrowLeft, 
  X, 
  Upload, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar,
  Languages,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { format } from 'date-fns';
import { ar, enUS, fr } from 'date-fns/locale';
import { useLocale } from 'next-intl';

// ✅ Enhanced schema with translations
const formSchema = z.object({
  // Arabic (default) fields
  title: z.string()
    .min(1, 'العنوان مطلوب')
    .max(100, 'العنوان طويل جداً'),
  description: z.string()
    .min(1, 'الوصف مطلوب')
    .max(10000, 'الوصف طويل جداً'),
  targetAmount: z.number()
    .min(1, 'المبلغ المستهدف ($) مطلوب')
    .max(1000000, 'المبلغ المستهدف ($) كبير جداً'),
  categoryId: z.string()
    .min(1, 'القسم مطلوب'),
  isActive: z.boolean(),
  images: z.array(z.string())
    .min(1, 'صورة واحدة على الأقل مطلوبة')
    .max(5, 'الحد الأقصى 5 صور'),
  videoUrl: z.string().optional(),
  currentAmount: z.number(),
  
  // English translations (optional)
  title_en: z.string().optional(),
  description_en: z.string().optional(),
  
  // French translations (optional)
  title_fr: z.string().optional(),
  description_fr: z.string().optional(),
});

// ✅ Update schema with translations
const updateSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  description: z.string().min(1, 'الوصف مطلوب'),
  videoUrl: z.string().optional(),
  
  // Translations
  title_en: z.string().optional(),
  description_en: z.string().optional(),
  title_fr: z.string().optional(),
  description_fr: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

interface Category {
  id: string;
  name: string;
}

interface Update {
  id: string;
  title: string;
  description: string;
  image?: string;
  videoUrl?: string;
  createdAt: string;
  translations?: {
    locale: string;
    title: string;
    description: string;
  }[];
}

const getDateLocale = (locale: string) => {
  switch (locale) {
    case 'en': return enUS;
    case 'fr': return fr;
    default: return ar;
  }
};

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const locale = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isEditUpdateDialogOpen, setIsEditUpdateDialogOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<Update | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [uploadingUpdateImage, setUploadingUpdateImage] = useState(false);
  const [updateImage, setUpdateImage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'ar' | 'en' | 'fr'>('ar');
  const [updateActiveTab, setUpdateActiveTab] = useState<'ar' | 'en' | 'fr'>('ar');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      targetAmount: 0,
      currentAmount: 0,
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

  const updateForm = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      title: '',
      description: '',
      videoUrl: '',
      title_en: '',
      description_en: '',
      title_fr: '',
      description_fr: '',
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!params?.id) return;
      
      try {
        const [campaignRes, categoriesRes] = await Promise.all([
          axios.get(`/api/campaigns/${params.id}`, {
            headers: { 'x-locale': locale },
          }),
          axios.get('/api/categories', {
            headers: { 'x-locale': locale },
          })
        ]);

        const campaign = campaignRes.data;
        setCategories(categoriesRes.data.items);

        // ✅ Fetch all translations for the campaign
        const allTranslationsRes = await axios.get(`/api/campaigns/${params.id}/translations`);
        const allTranslations = allTranslationsRes.data;

        // Find English and French translations
        const enTranslation = allTranslations.find((t: any) => t.locale === 'en');
        const frTranslation = allTranslations.find((t: any) => t.locale === 'fr');

        form.reset({
          title: campaign.title,
          description: campaign.description,
          targetAmount: campaign.targetAmount,
          currentAmount: campaign.currentAmount,
          categoryId: campaign.category.id,
          isActive: campaign.isActive,
          images: campaign.images,
          videoUrl: campaign.videoUrl || '',
          
          // Set translation fields
          title_en: enTranslation?.title || '',
          description_en: enTranslation?.description || '',
          title_fr: frTranslation?.title || '',
          description_fr: frTranslation?.description || '',
        });
      } catch (error) {
        console.error('Error fetching campaign:', error);
        toast.error('فشل في تحميل بيانات الحملة');
        router.push('/dashboard/campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, locale, form, router]);

  useEffect(() => {
    const fetchUpdates = async () => {
      if (!params?.id) return;
      try {
        // ✅ Fetch updates with all translations
        const response = await axios.get(`/api/campaigns/${params.id}/updates/all-translations`);
        setUpdates(response.data);
      } catch (error) {
        console.error('Error fetching updates:', error);
        toast.error('فشل في تحميل التحديثات');
      }
    };

    fetchUpdates();
  }, [params?.id]);

  const onSubmit = async (values: FormValues) => {
    if (!params?.id) return;
    
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
        translations: {
          en: {
            title: values.title_en,
            description: values.description_en,
          },
          fr: {
            title: values.title_fr,
            description: values.description_fr,
          },
        },
      };

      await axios.put(`/api/campaigns/${params.id}`, requestData);
      toast.success('تم تحديث الحملة بنجاح');
      //router.push('/dashboard/campaigns');
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('فشل في تحديث الحملة');
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

  const handleUpdateImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingUpdateImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData);
      setUpdateImage(response.data.url);
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('فشل في رفع الصورة');
    } finally {
      setUploadingUpdateImage(false);
    }
  };

  const removeUpdateImage = async () => {
    try {
      if (updateImage) {
        const publicId = updateImage.split('/').slice(-1)[0].split('.')[0];
        await axios.delete(`/api/upload?publicId=${publicId}`);
      }
      setUpdateImage("");
      toast.success('تم حذف الصورة بنجاح');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('فشل في حذف الصورة');
    }
  };

  const handleAddUpdate = async (data: UpdateFormValues) => {
    try {
      setUpdateLoading(true);
      
      // ✅ Prepare update with translations
      const requestData = {
        title: data.title,
        description: data.description,
        image: updateImage,
        videoUrl: data.videoUrl,
        translations: {
          en: {
            title: data.title_en,
            description: data.description_en,
          },
          fr: {
            title: data.title_fr,
            description: data.description_fr,
          },
        },
      };

      const response = await axios.post(
        `/api/campaigns/${params.id}/updates`,
        requestData
      );

      setUpdates(prev => [response.data, ...prev]);
      updateForm.reset();
      setUpdateImage('');
      setIsUpdateDialogOpen(false);
      setUpdateActiveTab('ar');
      toast.success('تم إضافة التحديث بنجاح');
    } catch (error) {
      console.error('Error adding update:', error);
      toast.error('فشل في إضافة التحديث');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleEditUpdate = async (id: string, data: UpdateFormValues) => {
    setUpdateLoading(true);
    try {
      // ✅ Prepare update with translations
      const requestData = {
        title: data.title,
        description: data.description,
        image: updateImage || selectedUpdate?.image,
        videoUrl: data.videoUrl,
        translations: {
          en: {
            title: data.title_en,
            description: data.description_en,
          },
          fr: {
            title: data.title_fr,
            description: data.description_fr,
          },
        },
      };

      const response = await axios.patch(
        `/api/campaigns/${params.id}/updates/${id}`,
        requestData
      );
      
      setUpdates(updates.map(update => update.id === id ? response.data : update));
      setIsEditUpdateDialogOpen(false);
      setSelectedUpdate(null);
      setUpdateImage('');
      setUpdateActiveTab('ar');
      toast.success('تم تحديث التحديث بنجاح');
    } catch (error) {
      console.error('Error editing update:', error);
      toast.error('فشل في تحديث التحديث');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التحديث؟')) return;
    
    try {
      await axios.delete(`/api/campaigns/${params.id}/updates/${id}`);
      setUpdates(updates.filter(update => update.id !== id));
      toast.success('تم حذف التحديث بنجاح');
    } catch (error) {
      console.error('Error deleting update:', error);
      toast.error('فشل في حذف التحديث');
    }
  };

  const openEditDialog = (update: Update) => {
    setSelectedUpdate(update);
    
    // Find translations
    const enTranslation = update.translations?.find(t => t.locale === 'en');
    const frTranslation = update.translations?.find(t => t.locale === 'fr');
    
    updateForm.reset({
      title: update.title,
      description: update.description,
      videoUrl: update.videoUrl || '',
      title_en: enTranslation?.title || '',
      description_en: enTranslation?.description || '',
      title_fr: frTranslation?.title || '',
      description_fr: frTranslation?.description || '',
    });
    
    setUpdateImage(update.image || '');
    setIsEditUpdateDialogOpen(true);
  };

  // ✅ Check translation completeness
  const getTranslationStatus = () => {
    const hasEn = !!form.getValues('title_en') && !!form.getValues('description_en');
    const hasFr = !!form.getValues('title_fr') && !!form.getValues('description_fr');
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
          <h1 className="text-2xl font-bold text-gray-800">تعديل الحملة</h1>
          <p className="text-gray-600">قم بتحديث معلومات الحملة</p>
          
          {/* ✅ Translation Status Badge */}
          <div className="flex items-center gap-2 mt-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              الترجمات: {translationStatus.completed}/{translationStatus.total}
            </span>
            {translationStatus.hasEn && (
              <CheckCircle2 className="w-4 h-4 text-green-600" title="English available" />
            )}
            {translationStatus.hasFr && (
              <CheckCircle2 className="w-4 h-4 text-blue-600" title="French available" />
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
          {/* ✅ Multi-Language Tabs for Campaign Info */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Languages className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-semibold">المعلومات الأساسية</h2>
            </div>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3 mb-6" dir="rtl">
                <TabsTrigger value="ar" className="gap-2">
                  🇸🇦 العربية
                </TabsTrigger>
                <TabsTrigger value="en" className="gap-2">
                  🇬🇧 English
                </TabsTrigger>
                <TabsTrigger value="fr" className="gap-2">
                  🇫🇷 Français
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
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* English Tab */}
              <TabsContent value="en" className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className='mt-[5px]'>
                    English translations are optional. If not provided, Arabic content will be displayed.
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
                      <FormMessage />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* French Tab */}
              <TabsContent value="fr" className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className='mt-[5px]'>
                    Les traductions françaises sont facultatives. Si elles ne sont pas fournies, le contenu arabe sera affiché.
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
                      <FormMessage />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    <FormLabel>المبلغ المستهدف ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        placeholder="أدخل المبلغ المستهدف ($)"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem dir='rtl'>
                    <FormLabel>المبلغ الحالي</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        placeholder="المبلغ الحالي"
                        disabled
                      />
                    </FormControl>
                    <FormDescription>
                      لا يمكن تعديل المبلغ الحالي مباشرة، يتم تحديثه تلقائياً مع التبرعات
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>رابط الفيديو (اختياري)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="أدخل رابط الفيديو (YouTube أو Vimeo)"
                      />
                    </FormControl>
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
                  <FormLabel>صور الحملة</FormLabel>
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
                        يمكنك رفع حتى 5 صور للحملة. الصورة الأولى ستكون الصورة الرئيسية.
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
                      تحديد ما إذا كانت الحملة نشطة أم لا
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

          {!form.getValues('isActive') && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className='mt-[5px]'>
                تحذير: الحملة غير نشطة حالياً. لن يتمكن المستخدمون من رؤيتها أو التبرع لها.
              </AlertDescription>
            </Alert>
          )}

          {/* ✅ Campaign Updates Section with Translations */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">تحديثات الحملة</h2>
              <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    إضافة تحديث
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>إضافة تحديث جديد</DialogTitle>
                  </DialogHeader>
                  <Form {...updateForm}>
                    <form onSubmit={updateForm.handleSubmit(handleAddUpdate)} className="space-y-4">
                      <Tabs value={updateActiveTab} onValueChange={(v) => setUpdateActiveTab(v as any)}>
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="ar">🇸🇦 العربية</TabsTrigger>
                          <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
                          <TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
                        </TabsList>

                        <TabsContent value="ar" className="space-y-4">
                          <FormField
                            control={updateForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem dir='rtl'>
                                <FormLabel>عنوان التحديث *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="أدخل عنوان التحديث" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={updateForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem dir='rtl'>
                                <FormLabel>وصف التحديث *</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    placeholder="اكتب وصف التحديث..."
                                    className="min-h-[100px]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>

                        <TabsContent value="en" className="space-y-4">
                          <FormField
                            control={updateForm.control}
                            name="title_en"
                            render={({ field }) => (
                              <FormItem dir='rtl'>
                                <FormLabel>Update Title (English)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter update title in English" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={updateForm.control}
                            name="description_en"
                            render={({ field }) => (
                              <FormItem dir='rtl'>
                                <FormLabel>Update Description (English)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    placeholder="Write update description in English..."
                                    className="min-h-[100px]"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TabsContent>

                        <TabsContent value="fr" className="space-y-4">
                          <FormField
                            control={updateForm.control}
                            name="title_fr"
                            render={({ field }) => (
                              <FormItem dir='rtl'>
                                <FormLabel>Titre de la mise à jour (Français)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Entrez le titre de la mise à jour en français" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={updateForm.control}
                            name="description_fr"
                            render={({ field }) => (
                              <FormItem dir='rtl'>
                                <FormLabel>Description de la mise à jour (Français)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    placeholder="Rédigez la description de la mise à jour en français..."
                                    className="min-h-[100px]"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                      </Tabs>
                      
                      {/* Image Upload Section */}
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                          صورة التحديث (اختياري)
                        </label>
                        
                        {updateImage ? (
                          <div className="relative">
                            <img
                              src={updateImage}
                              alt="Update preview"
                              className="h-48 w-full object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={removeUpdateImage}
                              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleUpdateImageUpload}
                              className="hidden"
                              id="update-image-upload"
                              disabled={uploadingUpdateImage}
                            />
                            <label
                              htmlFor="update-image-upload"
                              className={`flex flex-col items-center justify-center h-32 w-full border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-colors ${
                                uploadingUpdateImage ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {uploadingUpdateImage ? (
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 text-gray-400" />
                                  <span className="mt-2 text-sm text-gray-500">
                                    اضغط لرفع صورة
                                  </span>
                                </>
                              )}
                            </label>
                          </div>
                        )}
                      </div>

                      <FormField
                        control={updateForm.control}
                        name="videoUrl"
                        render={({ field }) => (
                          <FormItem dir='rtl'>
                            <FormLabel>رابط الفيديو (اختياري)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="أدخل رابط الفيديو" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                   
                      <div className="flex justify-end gap-3 mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsUpdateDialogOpen(false);
                            updateForm.reset();
                            setUpdateImage('');
                            setUpdateActiveTab('ar');
                          }}
                        >
                          إلغاء
                        </Button>
                        <Button
                          type="submit"
                          className="gap-2"
                          disabled={updateLoading || uploadingUpdateImage}
                        >
                          {(updateLoading || uploadingUpdateImage) && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          إضافة التحديث
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Updates List */}
            <div className="space-y-4">
              {updates.map((update) => {
                const enTrans = update.translations?.find(t => t.locale === 'en');
                const frTrans = update.translations?.find(t => t.locale === 'fr');
                
                return (
                  <Card key={update.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{update.title}</h3>
                          <div className="flex gap-1">
                            {enTrans && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded" title="English available">
                                EN
                              </span>
                            )}
                            {frTrans && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded" title="French available">
                                FR
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600">{update.description}</p>
                        {update.image && (
                          <img 
                            src={update.image} 
                            alt={update.title}
                            className="max-w-[200px] rounded-lg"
                          />
                        )}
                        {update.videoUrl && (
                          <div className="text-blue-600 hover:underline">
                            <a href={update.videoUrl} target="_blank" rel="noopener noreferrer">
                              مشاهدة الفيديو
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(update.createdAt), 'PPP', { locale: getDateLocale(locale) })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(update)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteUpdate(update.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              
              {updates.length === 0 && (
                <Card className="p-8 text-center text-gray-500">
                  <p>لا توجد تحديثات بعد. قم بإضافة تحديث لإبقاء المتبرعين على اطلاع.</p>
                </Card>
              )}
            </div>
          </div>

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
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              حفظ التغييرات
            </Button>
          </div>
        </form>
      </Form>

      {/* Edit Update Dialog */}
      <Dialog open={isEditUpdateDialogOpen} onOpenChange={setIsEditUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل التحديث</DialogTitle>
          </DialogHeader>
          {selectedUpdate && (
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit((data) => handleEditUpdate(selectedUpdate.id, data))} className="space-y-4">
                <Tabs value={updateActiveTab} onValueChange={(v) => setUpdateActiveTab(v as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="ar">🇸🇦 العربية</TabsTrigger>
                    <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
                    <TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ar" className="space-y-4">
                    <FormField
                      control={updateForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem dir='rtl'>
                          <FormLabel>عنوان التحديث *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="أدخل عنوان التحديث" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={updateForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem dir='rtl'>
                          <FormLabel>وصف التحديث *</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="اكتب وصف التحديث..."
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="en" className="space-y-4">
                    <FormField
                      control={updateForm.control}
                      name="title_en"
                      render={({ field }) => (
                        <FormItem dir='rtl'>
                          <FormLabel>Update Title (English)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter update title in English" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={updateForm.control}
                      name="description_en"
                      render={({ field }) => (
                        <FormItem dir='rtl'>
                          <FormLabel>Update Description (English)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Write update description in English..."
                              className="min-h-[100px]"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="fr" className="space-y-4">
                    <FormField
                      control={updateForm.control}
                      name="title_fr"
                      render={({ field }) => (
                        <FormItem dir='rtl'>
                          <FormLabel>Titre de la mise à jour (Français)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Entrez le titre de la mise à jour en français" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={updateForm.control}
                      name="description_fr"
                      render={({ field }) => (
                        <FormItem dir='rtl'>
                          <FormLabel>Description de la mise à jour (Français)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Rédigez la description de la mise à jour en français..."
                              className="min-h-[100px]"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                {/* Image Section */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    صورة التحديث (اختياري)
                  </label>
                  
                  {updateImage ? (
                    <div className="relative">
                      <img
                        src={updateImage}
                        alt="Update preview"
                        className="h-48 w-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeUpdateImage}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUpdateImageUpload}
                        className="hidden"
                        id="edit-update-image-upload"
                        disabled={uploadingUpdateImage}
                      />
                      <label
                        htmlFor="edit-update-image-upload"
                        className={`flex flex-col items-center justify-center h-32 w-full border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-colors ${
                          uploadingUpdateImage ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploadingUpdateImage ? (
                          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-gray-400" />
                            <span className="mt-2 text-sm text-gray-500">
                              اضغط لرفع صورة
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                <FormField
                  control={updateForm.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem dir='rtl'>
                      <FormLabel>رابط الفيديو (اختياري)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل رابط الفيديو" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditUpdateDialogOpen(false);
                      setSelectedUpdate(null);
                      setUpdateImage('');
                      setUpdateActiveTab('ar');
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    className="gap-2"
                    disabled={updateLoading || uploadingUpdateImage}
                  >
                    {(updateLoading || uploadingUpdateImage) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    حفظ التغييرات
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}