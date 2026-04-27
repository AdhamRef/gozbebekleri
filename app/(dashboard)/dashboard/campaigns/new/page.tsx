'use client';
import ReactCountryFlag from 'react-country-flag';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WysiwygEditor from '@/app/[locale]/blog/_components/wysiwyg/wysiwyg-editor';
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
  Globe,
  Star,
  GripVertical
} from 'lucide-react';
import { useLocale } from 'next-intl';
import {
  SuggestedDonationsSection,
  type SuggestedDonationsSectionRef,
} from '../_components/SuggestedDonationsSection';
import {
  SuggestedShareCountsSection,
  type SuggestedShareCountsSectionRef,
} from '../_components/SuggestedShareCountsSection';

// ✅ Enhanced schema with translations
const formSchema = z
  .object({
  title: z.string()
    .min(1, 'العنوان مطلوب')
    .max(100, 'العنوان طويل جداً'),
  slug: z.string().max(80, 'الـ slug طويل جداً').optional().or(z.literal('')),
  targetAmount: z.number().min(0).max(1000000),
  goalType: z.enum(['FIXED', 'OPEN']),
  fundraisingMode: z.enum(['AMOUNT', 'SHARES']),
  sharePriceUSD: z.number().min(0).max(1000000).optional(),
  categoryId: z.string()
    .min(1, 'الحملة مطلوب'),
  isActive: z.boolean(),
  images: z.array(z.string())
    .min(1, 'صورة واحدة على الأقل مطلوبة')
    .max(5, 'الحد الأقصى 5 صور'),
  videoUrl: z.string().optional(),
  
  title_en: z.string().min(1, 'English title is required'),
  title_fr: z.string().optional(),
  title_tr: z.string().optional(),
  title_id: z.string().optional(),
  title_pt: z.string().optional(),
  title_es: z.string().optional(),
})
  .superRefine((data, ctx) => {
    if (data.goalType === 'FIXED' && (!data.targetAmount || data.targetAmount < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'المبلغ المستهدف مطلوب (≥ 1) عند اختيار هدف ثابت',
        path: ['targetAmount'],
      });
    }
    if (data.fundraisingMode === 'SHARES' && (!data.sharePriceUSD || data.sharePriceUSD <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'أدخل سعر السهم الواحد بالدولار الأمريكي لمشاريع السهوم',
        path: ['sharePriceUSD'],
      });
    }
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
  const [activeTab, setActiveTab] = useState<'ar' | 'en' | 'fr' | 'tr' | 'id' | 'pt' | 'es'>('ar');
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);
  const suggestedDonationsRef = useRef<SuggestedDonationsSectionRef>(null);
  const suggestedShareCountsRef = useRef<SuggestedShareCountsSectionRef>(null);

  const [descriptionAr, setDescriptionAr] = useState<string | null>(null);
  const [descriptionEn, setDescriptionEn] = useState<string | null>(null);
  const [descriptionFr, setDescriptionFr] = useState<string | null>(null);
  const [descriptionTr, setDescriptionTr] = useState<string | null>(null);
  const [descriptionId, setDescriptionId] = useState<string | null>(null);
  const [descriptionPt, setDescriptionPt] = useState<string | null>(null);
  const [descriptionEs, setDescriptionEs] = useState<string | null>(null);

  const editorClassName = "w-full border border-stone-200 rounded-md bg-white [&_.ProseMirror]:min-h-[150px] [&_.ProseMirror]:p-4 [&_.ProseMirror]:focus:outline-none";

  const parseEditorContent = (json: string | null) => {
    if (!json) return { type: "doc", content: [{ type: "paragraph" }] };
    const trimmed = json.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === 'doc') return parsed;
      } catch {}
    }
    return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: json }] }] };
  };

  const isDescEmpty = (json: string | null) => {
    if (!json) return true;
    try {
      const doc = JSON.parse(json);
      if (!doc.content || doc.content.length === 0) return true;
      return doc.content.every((n: { type: string; content?: unknown[] }) =>
        n.type === 'paragraph' && (!n.content || n.content.length === 0)
      );
    } catch { return true; }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      slug: '',
      targetAmount: 0,
      goalType: 'FIXED',
      fundraisingMode: 'AMOUNT',
      sharePriceUSD: 0,
      categoryId: '',
      isActive: true,
      images: [],
      videoUrl: '',
      title_en: '',
      title_fr: '',
      title_tr: '',
      title_id: '',
      title_pt: '',
      title_es: '',
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
        toast.error('فشل في تحميل الحملات');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [locale]);

  const onSubmit = async (values: FormValues) => {
    if (isDescEmpty(descriptionAr)) {
      toast.error('الوصف العربي مطلوب');
      setActiveTab('ar');
      return;
    }
    if (isDescEmpty(descriptionEn)) {
      toast.error('English description is required');
      setActiveTab('en');
      return;
    }
    setSaving(true);
    try {
      // ✅ Prepare request with translations
      const requestData = {
        title: values.title,
        slug: values.slug || undefined,
        description: descriptionAr || '',
        goalType: values.goalType,
        fundraisingMode: values.fundraisingMode,
        targetAmount: values.goalType === 'OPEN' ? 0 : values.targetAmount,
        sharePriceUSD:
          values.fundraisingMode === 'SHARES' ? values.sharePriceUSD : undefined,
        categoryId: values.categoryId,
        isActive: values.isActive,
        images: values.images,
        videoUrl: values.videoUrl,

        // English is always sent (required); other locales only when title + description provided.
        translations: {
          en: { title: values.title_en, description: descriptionEn },
          ...(values.title_fr && !isDescEmpty(descriptionFr) ? { fr: { title: values.title_fr, description: descriptionFr } } : {}),
          ...(values.title_tr && !isDescEmpty(descriptionTr) ? { tr: { title: values.title_tr, description: descriptionTr } } : {}),
          ...(values.title_id && !isDescEmpty(descriptionId) ? { id: { title: values.title_id, description: descriptionId } } : {}),
          ...(values.title_pt && !isDescEmpty(descriptionPt) ? { pt: { title: values.title_pt, description: descriptionPt } } : {}),
          ...(values.title_es && !isDescEmpty(descriptionEs) ? { es: { title: values.title_es, description: descriptionEs } } : {}),
        },
        suggestedDonations:
          values.fundraisingMode === 'AMOUNT'
            ? suggestedDonationsRef.current?.getPayload()
            : undefined,
        suggestedShareCounts:
          values.fundraisingMode === 'SHARES'
            ? suggestedShareCountsRef.current?.getPayload()
            : undefined,
      };

      await axios.post('/api/campaigns', requestData);
      toast.success('تم إنشاء المشروع بنجاح');
      router.push('/dashboard/campaigns');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('فشل في إنشاء المشروع');
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

  const reorderImages = (from: number, to: number) => {
    if (from === to) return;
    const list = [...form.getValues('images')];
    if (from < 0 || from >= list.length || to < 0 || to >= list.length) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    form.setValue('images', list, { shouldValidate: true, shouldDirty: true });
    if (to === 0 && from !== 0) {
      toast.success('تم تعيين الصورة الرئيسية');
    }
  };

  // ✅ Check translation completeness
const getTranslationStatus = () => {
    const hasEn = !!form.watch('title_en') && !isDescEmpty(descriptionEn);
    const hasFr = !!form.watch('title_fr') && !isDescEmpty(descriptionFr);
    const hasTr = !!form.watch('title_tr') && !isDescEmpty(descriptionTr);
    const hasId = !!form.watch('title_id') && !isDescEmpty(descriptionId);
    const hasPt = !!form.watch('title_pt') && !isDescEmpty(descriptionPt);
    const hasEs = !!form.watch('title_es') && !isDescEmpty(descriptionEs);
    const completed = [hasEn, hasFr, hasTr, hasId, hasPt, hasEs].filter(Boolean).length;
    return { completed, total: 6, hasEn, hasFr, hasTr, hasId, hasPt, hasEs };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#025EB8]" />
      </div>
    );
  }

  const translationStatus = getTranslationStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إنشاء مشروع جديدة</h1>
          <p className="text-gray-600">قم بإدخال معلومات المشروع</p>
          
          {/* ✅ Translation Status Badge */}
          <div className="flex items-center gap-2 mt-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              الترجمات: {translationStatus.completed}/{translationStatus.total}
            </span>
            {translationStatus.hasEn && (
              <CheckCircle2 className="w-4 h-4 text-green-600" title="English ready" />
            )}
            {translationStatus.hasFr && <CheckCircle2 className="w-4 h-4 text-[#025EB8]" title="French ready" />}
            {translationStatus.hasTr && <CheckCircle2 className="w-4 h-4 text-green-600" title="Turkish ready" />}
            {translationStatus.hasId && <CheckCircle2 className="w-4 h-4 text-green-600" title="Indonesian ready" />}
            {translationStatus.hasPt && <CheckCircle2 className="w-4 h-4 text-green-600" title="Portuguese ready" />}
            {translationStatus.hasEs && <CheckCircle2 className="w-4 h-4 text-green-600" title="Spanish ready" />}
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

            {/* Slug — outside the language tabs (one URL per campaign, derived from English) */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem dir='rtl' className="mb-6">
                  <FormLabel>الرابط (slug) — اختياري</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="مثال: gaza-emergency-relief" dir="ltr" />
                  </FormControl>
                  <FormDescription>
                    يُستخدم في رابط المشروع. إذا تُرك فارغاً سيُنشأ تلقائياً من العنوان الإنجليزي.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="flex flex-wrap gap-1 mb-6">
                <TabsTrigger value="ar" className="gap-2">
                  <ReactCountryFlag countryCode="SA" svg style={{width:'1em',height:'1em',verticalAlign:'middle'}} /> العربية
                  <span className="text-xs text-red-600">*</span>
                </TabsTrigger>
                <TabsTrigger value="en" className="gap-2">
                  <ReactCountryFlag countryCode="GB" svg style={{width:'1em',height:'1em',verticalAlign:'middle'}} /> English
                  <span className="text-xs text-red-600">*</span>
                  {translationStatus.hasEn && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                </TabsTrigger>
                <TabsTrigger value="fr" className="gap-2">
                  <ReactCountryFlag countryCode="FR" svg style={{width:'1em',height:'1em',verticalAlign:'middle'}} /> Français
                  {translationStatus.hasFr && <CheckCircle2 className="w-3 h-3 text-[#025EB8]" />}
                </TabsTrigger>
                <TabsTrigger value="tr" className="gap-2">
                  <ReactCountryFlag countryCode="TR" svg style={{width:'1em',height:'1em',verticalAlign:'middle'}} /> Türkçe
                  {translationStatus.hasTr && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                </TabsTrigger>
                <TabsTrigger value="id" className="gap-2">
                  <ReactCountryFlag countryCode="ID" svg style={{width:'1em',height:'1em',verticalAlign:'middle'}} /> Bahasa
                  {translationStatus.hasId && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                </TabsTrigger>
                <TabsTrigger value="pt" className="gap-2">
                  <ReactCountryFlag countryCode="PT" svg style={{width:'1em',height:'1em',verticalAlign:'middle'}} /> Português
                  {translationStatus.hasPt && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                </TabsTrigger>
                <TabsTrigger value="es" className="gap-2">
                  <ReactCountryFlag countryCode="ES" svg style={{width:'1em',height:'1em',verticalAlign:'middle'}} /> Español
                  {translationStatus.hasEs && <CheckCircle2 className="w-3 h-3 text-green-600" />}
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
                        <FormLabel>الحملة *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الحملة" />
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
                        <FormLabel>عنوان المشروع *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="أدخل عنوان المشروع" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                <FormItem dir='rtl'>
                  <FormLabel>وصف المشروع *</FormLabel>
                  <WysiwygEditor
                    defaultValue={parseEditorContent(descriptionAr)}
                    onDebouncedUpdate={(editor) => setDescriptionAr(JSON.stringify(editor?.getJSON()))}
                    className={editorClassName}
                  />
                  <FormDescription>
                    قدم وصفاً شاملاً للمشروع وأهدافها
                  </FormDescription>
                </FormItem>
              </TabsContent>

              {/* English Tab — required */}
              <TabsContent value="en" className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className='mt-[5px]'>
                    English is required. The slug is auto-generated from the English title.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="title_en"
                  render={({ field }) => (
                    <FormItem dir='rtl'>
                      <FormLabel>Campaign Title (English) *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter campaign title in English" />
                      </FormControl>
                      <FormDescription>
                        Required — also drives the slug when no manual override is set.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem dir='rtl'>
                  <FormLabel>Campaign Description (English) *</FormLabel>
                  <WysiwygEditor
                    defaultValue={parseEditorContent(descriptionEn)}
                    onDebouncedUpdate={(editor) => setDescriptionEn(JSON.stringify(editor?.getJSON()))}
                    className={editorClassName}
                  />
                  <FormDescription>
                    Required — comprehensive English description of the campaign and its goals.
                  </FormDescription>
                </FormItem>
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

                <FormItem dir='rtl'>
                  <FormLabel>Description de la campagne (Français)</FormLabel>
                  <WysiwygEditor
                    defaultValue={parseEditorContent(descriptionFr)}
                    onDebouncedUpdate={(editor) => setDescriptionFr(JSON.stringify(editor?.getJSON()))}
                    className={editorClassName}
                  />
                  <FormDescription>
                    Fournissez une description complète en français de la campagne et de ses objectifs
                  </FormDescription>
                </FormItem>

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

              <TabsContent value="tr" className="space-y-6">
                <FormField control={form.control} name="title_tr" render={({ field }) => (
                  <FormItem dir="rtl"><FormLabel>Kampanya Başlığı (Türkçe)</FormLabel><FormControl><Input {...field} placeholder="Türkçe kampanya başlığı" /></FormControl></FormItem>
                )} />
                <FormItem dir="rtl">
                  <FormLabel>Kampanya Açıklaması</FormLabel>
                  <WysiwygEditor defaultValue={parseEditorContent(descriptionTr)} onDebouncedUpdate={(editor) => setDescriptionTr(JSON.stringify(editor?.getJSON()))} className={editorClassName} />
                </FormItem>
              </TabsContent>
              <TabsContent value="id" className="space-y-6">
                <FormField control={form.control} name="title_id" render={({ field }) => (
                  <FormItem dir="rtl"><FormLabel>Judul Kampanye (Indonesia)</FormLabel><FormControl><Input {...field} placeholder="Judul kampanye dalam Bahasa Indonesia" /></FormControl></FormItem>
                )} />
                <FormItem dir="rtl">
                  <FormLabel>Deskripsi Kampanye</FormLabel>
                  <WysiwygEditor defaultValue={parseEditorContent(descriptionId)} onDebouncedUpdate={(editor) => setDescriptionId(JSON.stringify(editor?.getJSON()))} className={editorClassName} />
                </FormItem>
              </TabsContent>
              <TabsContent value="pt" className="space-y-6">
                <FormField control={form.control} name="title_pt" render={({ field }) => (
                  <FormItem dir="rtl"><FormLabel>Título da Campanha (Português)</FormLabel><FormControl><Input {...field} placeholder="Título da campanha em português" /></FormControl></FormItem>
                )} />
                <FormItem dir="rtl">
                  <FormLabel>Descrição da Campanha</FormLabel>
                  <WysiwygEditor defaultValue={parseEditorContent(descriptionPt)} onDebouncedUpdate={(editor) => setDescriptionPt(JSON.stringify(editor?.getJSON()))} className={editorClassName} />
                </FormItem>
              </TabsContent>
              <TabsContent value="es" className="space-y-6">
                <FormField control={form.control} name="title_es" render={({ field }) => (
                  <FormItem dir="rtl"><FormLabel>Título de la Campaña (Español)</FormLabel><FormControl><Input {...field} placeholder="Título de la campaña en español" /></FormControl></FormItem>
                )} />
                <FormItem dir="rtl">
                  <FormLabel>Descripción de la Campaña</FormLabel>
                  <WysiwygEditor defaultValue={parseEditorContent(descriptionEs)} onDebouncedUpdate={(editor) => setDescriptionEs(JSON.stringify(editor?.getJSON()))} className={editorClassName} />
                </FormItem>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Campaign Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">إعدادات المشروع</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="goalType"
                render={({ field }) => (
                  <FormItem dir="rtl">
                    <FormLabel>نوع الهدف</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الهدف" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIXED">هدف محدد (شريط تقدم)</SelectItem>
                        <SelectItem value="OPEN">هدف مفتوح (بدون هدف نهائي)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      الهدف المفتوح يخفي المبلغ المستهدف وشريط النسبة؛ يبقى إجمالي ما جُمع ظاهرًا.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fundraisingMode"
                render={({ field }) => (
                  <FormItem dir="rtl">
                    <FormLabel>طريقة التبرع</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="طريقة التبرع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AMOUNT">مبلغ حر</SelectItem>
                        <SelectItem value="SHARES">سهوم (سعر السهم × العدد)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      في وضع السهوم يحدد المتبرع عدد الأسهم؛ المبلغ = العدد × سعر السهم (بالدولار).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('goalType') === 'FIXED' && (
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
                      المبلغ الإجمالي المطلوب للمشروع بالدولار
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              )}

              {form.watch('fundraisingMode') === 'SHARES' && (
                <FormField
                  control={form.control}
                  name="sharePriceUSD"
                  render={({ field }) => (
                    <FormItem dir="rtl">
                      <FormLabel>سعر السهم الواحد (USD) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="مثال: 100"
                        />
                      </FormControl>
                      <FormDescription>
                        سعر كل سهم بالدولار؛ يُحوَّل تلقائيًا لعملة العرض للمتبرع.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem dir='rtl'>
                    <FormLabel>رابط الفيديو (اختياري)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="أدخل رابط الفيديو (YouTube أو Facebook)"
                      />
                    </FormControl>
                    <FormDescription>
                      رابط فيديو توضيحي للمشروع
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {form.watch('fundraisingMode') === 'SHARES' && (
              <div className="mt-6">
                <SuggestedShareCountsSection ref={suggestedShareCountsRef} />
              </div>
            )}
            {form.watch('fundraisingMode') === 'AMOUNT' && (
              <div className="mt-6">
                <SuggestedDonationsSection ref={suggestedDonationsRef} />
              </div>
            )}
          </Card>

          {/* Images */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem dir='rtl'>
                  <FormLabel>صور المشروع *</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {field.value.map((url, index) => {
                          const isMain = index === 0;
                          const isDragging = draggedImageIndex === index;
                          const isDropTarget = dragOverImageIndex === index && draggedImageIndex !== index;
                          return (
                            <div
                              key={url}
                              draggable
                              onDragStart={(e) => {
                                setDraggedImageIndex(index);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverImageIndex !== index) setDragOverImageIndex(index);
                              }}
                              onDragLeave={() => {
                                if (dragOverImageIndex === index) setDragOverImageIndex(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedImageIndex !== null && draggedImageIndex !== index) {
                                  reorderImages(draggedImageIndex, index);
                                }
                                setDraggedImageIndex(null);
                                setDragOverImageIndex(null);
                              }}
                              onDragEnd={() => {
                                setDraggedImageIndex(null);
                                setDragOverImageIndex(null);
                              }}
                              className={`relative group rounded-lg cursor-move transition-all ${
                                isMain
                                  ? 'ring-4 ring-[#025EB8] ring-offset-2 shadow-lg'
                                  : 'ring-1 ring-gray-200 hover:ring-[#025EB8]/40'
                              } ${isDragging ? 'opacity-40 scale-95' : ''} ${
                                isDropTarget ? 'ring-4 ring-[#FA5D17] ring-offset-2' : ''
                              }`}
                            >
                              <img
                                src={url}
                                alt={`صورة ${index + 1}`}
                                draggable={false}
                                className="w-full h-32 object-cover rounded-lg pointer-events-none select-none"
                              />
                              {isMain && (
                                <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-[#025EB8] to-[#025EB8]/0 rounded-t-lg p-2 flex items-center gap-1.5">
                                  <Star className="w-4 h-4 text-white fill-white" />
                                  <span className="text-white text-xs font-bold drop-shadow">الصورة الرئيسية</span>
                                </div>
                              )}
                              <div className="absolute top-2 left-2 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              {!isMain && (
                                <button
                                  type="button"
                                  onClick={() => reorderImages(index, 0)}
                                  title="تعيين كصورة رئيسية"
                                  className="absolute bottom-2 left-2 px-2 py-1 bg-white text-[#025EB8] text-xs font-semibold rounded shadow opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:bg-[#025EB8] hover:text-white"
                                >
                                  <Star className="w-3 h-3" />
                                  جعلها الرئيسية
                                </button>
                              )}
                              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded font-mono">
                                {index + 1}
                              </div>
                            </div>
                          );
                        })}
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
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#025EB8] transition-colors"
                            >
                              {uploadingImage ? (
                                <Loader2 className="w-6 h-6 animate-spin text-[#025EB8]" />
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
                        يمكنك رفع حتى 5 صور للمشروع. <strong>الصورة الأولى</strong> ستكون الصورة الرئيسية المعروضة.
                        <br />
                        اسحب الصور لإعادة ترتيبها، أو اضغط زر <strong>«جعلها الرئيسية»</strong> لتغيير الصورة الرئيسية.
                        <br />
                        <span className="text-amber-700">
                          الحجم المُوصى به: <strong>1200×900 px</strong> (نسبة 4:3)، صيغة JPG أو PNG، حجم الملف لا يزيد عن 2MB.
                        </span>
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
                    <FormLabel>حالة المشروع</FormLabel>
                    <FormDescription>
                      تحديد ما إذا كانت المشروع نشطة ومرئية للمستخدمين فور الإنشاء
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
          {(translationStatus.hasEn || translationStatus.hasFr || translationStatus.hasTr || translationStatus.hasId || translationStatus.hasPt || translationStatus.hasEs) && (
            <Card className="p-6 bg-[#025EB8]/8 border-blue-200">
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-[#025EB8] mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[#025EB8] mb-2">ملخص الترجمات</h3>
                  <div className="space-y-1 text-sm text-[#025EB8]">
                    <p>✓ المحتوى العربي: مكتمل (مطلوب)</p>
                    {translationStatus.hasEn && (
                      <p>✓ الترجمة الإنجليزية: مكتملة</p>
                    )}
                    {translationStatus.hasFr && <p>✓ الترجمة الفرنسية: مكتملة</p>}
                    {translationStatus.hasTr && <p>✓ الترجمة التركية: مكتملة</p>}
                    {translationStatus.hasId && <p>✓ الترجمة الإندونيسية: مكتملة</p>}
                    {translationStatus.hasPt && <p>✓ الترجمة البرتغالية: مكتملة</p>}
                    {translationStatus.hasEs && <p>✓ الترجمة الإسبانية: مكتملة</p>}
                    {!translationStatus.hasEn && <p className="text-[#025EB8]">○ الترجمة الإنجليزية: غير مكتملة (اختياري)</p>}
                    {!translationStatus.hasFr && <p className="text-[#025EB8]">○ الترجمة الفرنسية: غير مكتملة (اختياري)</p>}
                    {!translationStatus.hasTr && <p className="text-[#025EB8]">○ الترجمة التركية: غير مكتملة (اختياري)</p>}
                    {!translationStatus.hasId && <p className="text-[#025EB8]">○ الترجمة الإندونيسية: غير مكتملة (اختياري)</p>}
                    {!translationStatus.hasPt && <p className="text-[#025EB8]">○ الترجمة البرتغالية: غير مكتملة (اختياري)</p>}
                    {!translationStatus.hasEs && <p className="text-[#025EB8]">○ الترجمة الإسبانية: غير مكتملة (اختياري)</p>}
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
              className="bg-[#025EB8] hover:bg-[#014fa0] gap-2"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              إنشاء المشروع
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}