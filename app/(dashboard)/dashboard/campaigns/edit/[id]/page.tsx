'use client';

import ReactCountryFlag from 'react-country-flag';
import { useEffect, useRef, useState } from 'react';
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
import {
  parseSuggestedDonations,
  type SuggestedDonationsConfig,
} from '@/lib/campaign/suggested-donations';
import {
  parseSuggestedShareCounts,
  type SuggestedShareCountsConfig,
} from '@/lib/campaign/campaign-modes';
import {
  SuggestedDonationsSection,
  type SuggestedDonationsSectionRef,
} from '../../_components/SuggestedDonationsSection';
import {
  SuggestedShareCountsSection,
  type SuggestedShareCountsSectionRef,
} from '../../_components/SuggestedShareCountsSection';

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
  currentAmount: z.number(),
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
        message: 'المبلغ المستهدف مطلوب (≥ 1) عند هدف ثابت',
        path: ['targetAmount'],
      });
    }
    if (data.fundraisingMode === 'SHARES' && (!data.sharePriceUSD || data.sharePriceUSD <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'سعر السهم بالدولار مطلوب لمشاريع السهوم',
        path: ['sharePriceUSD'],
      });
    }
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
  title_tr: z.string().optional(),
  description_tr: z.string().optional(),
  title_id: z.string().optional(),
  description_id: z.string().optional(),
  title_pt: z.string().optional(),
  description_pt: z.string().optional(),
  title_es: z.string().optional(),
  description_es: z.string().optional(),
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
  const [activeTab, setActiveTab] = useState<'ar' | 'en' | 'fr' | 'tr' | 'id' | 'pt' | 'es'>('ar');
  const [updateActiveTab, setUpdateActiveTab] = useState<'ar' | 'en' | 'fr' | 'tr' | 'id' | 'pt' | 'es'>('ar');
  const [suggestedSeed, setSuggestedSeed] = useState<
    SuggestedDonationsConfig | undefined
  >(undefined);
  const [shareCountsSeed, setShareCountsSeed] = useState<
    SuggestedShareCountsConfig | undefined
  >(undefined);
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
      currentAmount: 0,
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
      title_tr: '',
      description_tr: '',
      title_id: '',
      description_id: '',
      title_pt: '',
      description_pt: '',
      title_es: '',
      description_es: '',
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
        setSuggestedSeed(parseSuggestedDonations(campaign.suggestedDonations));
        setShareCountsSeed(parseSuggestedShareCounts(campaign.suggestedShareCounts));

        // ✅ Fetch all translations for the campaign
        const allTranslationsRes = await axios.get(`/api/campaigns/${params.id}/translations`);
        const allTranslations = allTranslationsRes.data;

        const getTr = (locale: string) => allTranslations.find((t: any) => t.locale === locale);
        const en = getTr('en'), fr = getTr('fr'), tr = getTr('tr'), id = getTr('id'), pt = getTr('pt'), es = getTr('es');

        form.reset({
          title: campaign.title,
          slug: campaign.slug || '',
          targetAmount: campaign.targetAmount,
          goalType: campaign.goalType ?? 'FIXED',
          fundraisingMode: campaign.fundraisingMode ?? 'AMOUNT',
          sharePriceUSD: campaign.sharePriceUSD ?? 0,
          currentAmount: campaign.currentAmount,
          categoryId: campaign.category.id,
          isActive: campaign.isActive,
          images: campaign.images,
          videoUrl: campaign.videoUrl || '',
          title_en: en?.title || '',
          title_fr: fr?.title || '',
          title_tr: tr?.title || '',
          title_id: id?.title || '',
          title_pt: pt?.title || '',
          title_es: es?.title || '',
        });

        setDescriptionAr(campaign.description || null);
        setDescriptionEn(en?.description || null);
        setDescriptionFr(fr?.description || null);
        setDescriptionTr(tr?.description || null);
        setDescriptionId(id?.description || null);
        setDescriptionPt(pt?.description || null);
        setDescriptionEs(es?.description || null);
      } catch (error) {
        console.error('Error fetching campaign:', error);
        toast.error('فشل في تحميل بيانات المشروع');
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
        toast.error('فشل في تحميل الإنجازات');
      }
    };

    fetchUpdates();
  }, [params?.id]);

  const onSubmit = async (values: FormValues) => {
    if (!params?.id) return;
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
      // ✅ Prepare request with translations (English always sent — required)
      const requestData = {
        title: values.title,
        slug: values.slug ?? '',
        description: descriptionAr || '',
        goalType: values.goalType,
        fundraisingMode: values.fundraisingMode,
        targetAmount: values.goalType === 'OPEN' ? 0 : values.targetAmount,
        sharePriceUSD:
          values.fundraisingMode === 'SHARES' ? values.sharePriceUSD : null,
        categoryId: values.categoryId,
        isActive: values.isActive,
        images: values.images,
        videoUrl: values.videoUrl,
        translations: {
          en: { title: values.title_en, description: descriptionEn },
          ...(values.title_fr || !isDescEmpty(descriptionFr) ? { fr: { title: values.title_fr, description: descriptionFr } } : {}),
          ...(values.title_tr || !isDescEmpty(descriptionTr) ? { tr: { title: values.title_tr, description: descriptionTr } } : {}),
          ...(values.title_id || !isDescEmpty(descriptionId) ? { id: { title: values.title_id, description: descriptionId } } : {}),
          ...(values.title_pt || !isDescEmpty(descriptionPt) ? { pt: { title: values.title_pt, description: descriptionPt } } : {}),
          ...(values.title_es || !isDescEmpty(descriptionEs) ? { es: { title: values.title_es, description: descriptionEs } } : {}),
        },
        suggestedDonations:
          values.fundraisingMode === 'AMOUNT'
            ? suggestedDonationsRef.current?.getPayload()
            : null,
        suggestedShareCounts:
          values.fundraisingMode === 'SHARES'
            ? suggestedShareCountsRef.current?.getPayload()
            : null,
      };

      await axios.put(`/api/campaigns/${params.id}`, requestData);
      toast.success('تم تحديث المشروع بنجاح');
      //router.push('/dashboard/campaigns');
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('فشل في تحديث المشروع');
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
          en: { title: data.title_en, description: data.description_en },
          fr: { title: data.title_fr, description: data.description_fr },
          tr: { title: data.title_tr, description: data.description_tr },
          id: { title: data.title_id, description: data.description_id },
          pt: { title: data.title_pt, description: data.description_pt },
          es: { title: data.title_es, description: data.description_es },
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
          en: { title: data.title_en, description: data.description_en },
          fr: { title: data.title_fr, description: data.description_fr },
          tr: { title: data.title_tr, description: data.description_tr },
          id: { title: data.title_id, description: data.description_id },
          pt: { title: data.title_pt, description: data.description_pt },
          es: { title: data.title_es, description: data.description_es },
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
    
    const getUT = (locale: string) => update.translations?.find(t => t.locale === locale);

    updateForm.reset({
      title: update.title,
      description: update.description,
      videoUrl: update.videoUrl || '',
      title_en: getUT('en')?.title || '',
      description_en: getUT('en')?.description || '',
      title_fr: getUT('fr')?.title || '',
      description_fr: getUT('fr')?.description || '',
      title_tr: getUT('tr')?.title || '',
      description_tr: getUT('tr')?.description || '',
      title_id: getUT('id')?.title || '',
      description_id: getUT('id')?.description || '',
      title_pt: getUT('pt')?.title || '',
      description_pt: getUT('pt')?.description || '',
      title_es: getUT('es')?.title || '',
      description_es: getUT('es')?.description || '',
    });
    
    setUpdateImage(update.image || '');
    setIsEditUpdateDialogOpen(true);
  };

  // ✅ Check translation completeness
  const getTranslationStatus = () => {
    const hasEn = !!form.getValues('title_en') && !isDescEmpty(descriptionEn);
    const hasFr = !!form.getValues('title_fr') && !isDescEmpty(descriptionFr);
    const hasTr = !!form.getValues('title_tr') && !isDescEmpty(descriptionTr);
    const hasId = !!form.getValues('title_id') && !isDescEmpty(descriptionId);
    const hasPt = !!form.getValues('title_pt') && !isDescEmpty(descriptionPt);
    const hasEs = !!form.getValues('title_es') && !isDescEmpty(descriptionEs);
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
          <h1 className="text-2xl font-bold text-gray-800">تعديل المشروع</h1>
          <p className="text-gray-600">قم بتحديث معلومات المشروع</p>
          
          {/* ✅ Translation Status Badge */}
          <div className="flex items-center gap-2 mt-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              الترجمات: {translationStatus.completed}/{translationStatus.total}
            </span>
            {translationStatus.hasEn && <span title="English available"><CheckCircle2 className="w-4 h-4 text-green-600" /></span>}
            {translationStatus.hasFr && <span title="French available"><CheckCircle2 className="w-4 h-4 text-[#025EB8]" /></span>}
            {translationStatus.hasTr && <span title="Turkish available"><CheckCircle2 className="w-4 h-4 text-red-500" /></span>}
            {translationStatus.hasId && <span title="Indonesian available"><CheckCircle2 className="w-4 h-4 text-orange-500" /></span>}
            {translationStatus.hasPt && <span title="Portuguese available"><CheckCircle2 className="w-4 h-4 text-green-700" /></span>}
            {translationStatus.hasEs && <span title="Spanish available"><CheckCircle2 className="w-4 h-4 text-yellow-600" /></span>}
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

            {/* Slug — outside language tabs (one URL per campaign, derived from English) */}
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
                    تغييره سيغيّر رابط هذه المشروع — احرص على إعادة توجيه الروابط القديمة. اتركه فارغاً لإعادة التوليد من العنوان الإنجليزي.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="flex flex-wrap gap-1 mb-6" dir="rtl">
                <TabsTrigger value="ar" className="gap-2"><ReactCountryFlag countryCode="SA" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> العربية</TabsTrigger>
                <TabsTrigger value="en" className="gap-2"><ReactCountryFlag countryCode="GB" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> English</TabsTrigger>
                <TabsTrigger value="fr" className="gap-2"><ReactCountryFlag countryCode="FR" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Français</TabsTrigger>
                <TabsTrigger value="tr" className="gap-2"><ReactCountryFlag countryCode="TR" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Türkçe</TabsTrigger>
                <TabsTrigger value="id" className="gap-2"><ReactCountryFlag countryCode="ID" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Bahasa</TabsTrigger>
                <TabsTrigger value="pt" className="gap-2"><ReactCountryFlag countryCode="PT" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Português</TabsTrigger>
                <TabsTrigger value="es" className="gap-2"><ReactCountryFlag countryCode="ES" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Español</TabsTrigger>
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
                </FormItem>
              </TabsContent>

              {/* French Tab */}
              <TabsContent value="fr" className="space-y-6">
                <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className='mt-[5px]'>Les traductions françaises sont facultatives. Si elles ne sont pas fournies, le contenu arabe sera affiché.</AlertDescription></Alert>
                <FormField control={form.control} name="title_fr" render={({ field }) => (
                  <FormItem dir='rtl'><FormLabel>Titre de la campagne (Français)</FormLabel><FormControl><Input {...field} placeholder="Entrez le titre de la campagne en français" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormItem dir='rtl'>
                  <FormLabel>Description de la campagne (Français)</FormLabel>
                  <WysiwygEditor defaultValue={parseEditorContent(descriptionFr)} onDebouncedUpdate={(editor) => setDescriptionFr(JSON.stringify(editor?.getJSON()))} className={editorClassName} />
                </FormItem>
              </TabsContent>

              {/* Turkish Tab */}
              <TabsContent value="tr" className="space-y-6">
                <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className='mt-[5px]'>Türkçe çeviriler isteğe bağlıdır. Sağlanmazsa Arapça içerik görüntülenecektir.</AlertDescription></Alert>
                <FormField control={form.control} name="title_tr" render={({ field }) => (
                  <FormItem dir='rtl'><FormLabel>Kampanya Başlığı (Türkçe)</FormLabel><FormControl><Input {...field} placeholder="Türkçe kampanya başlığı" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormItem dir='rtl'>
                  <FormLabel>Kampanya Açıklaması (Türkçe)</FormLabel>
                  <WysiwygEditor defaultValue={parseEditorContent(descriptionTr)} onDebouncedUpdate={(editor) => setDescriptionTr(JSON.stringify(editor?.getJSON()))} className={editorClassName} />
                </FormItem>
              </TabsContent>

              {/* Indonesian Tab */}
              <TabsContent value="id" className="space-y-6">
                <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className='mt-[5px]'>Terjemahan Bahasa Indonesia bersifat opsional. Jika tidak disediakan, konten Arab akan ditampilkan.</AlertDescription></Alert>
                <FormField control={form.control} name="title_id" render={({ field }) => (
                  <FormItem dir='rtl'><FormLabel>Judul Kampanye (Indonesia)</FormLabel><FormControl><Input {...field} placeholder="Judul kampanye dalam Bahasa Indonesia" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormItem dir='rtl'>
                  <FormLabel>Deskripsi Kampanye (Indonesia)</FormLabel>
                  <WysiwygEditor defaultValue={parseEditorContent(descriptionId)} onDebouncedUpdate={(editor) => setDescriptionId(JSON.stringify(editor?.getJSON()))} className={editorClassName} />
                </FormItem>
              </TabsContent>

              {/* Portuguese Tab */}
              <TabsContent value="pt" className="space-y-6">
                <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className='mt-[5px]'>As traduções em português são opcionais. Se não fornecidas, o conteúdo em árabe será exibido.</AlertDescription></Alert>
                <FormField control={form.control} name="title_pt" render={({ field }) => (
                  <FormItem dir='rtl'><FormLabel>Título da Campanha (Português)</FormLabel><FormControl><Input {...field} placeholder="Título da campanha em português" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormItem dir='rtl'>
                  <FormLabel>Descrição da Campanha (Português)</FormLabel>
                  <WysiwygEditor defaultValue={parseEditorContent(descriptionPt)} onDebouncedUpdate={(editor) => setDescriptionPt(JSON.stringify(editor?.getJSON()))} className={editorClassName} />
                </FormItem>
              </TabsContent>

              {/* Spanish Tab */}
              <TabsContent value="es" className="space-y-6">
                <Alert><AlertCircle className="h-4 w-4" /><AlertDescription className='mt-[5px]'>Las traducciones al español son opcionales. Si no se proporcionan, se mostrará el contenido en árabe.</AlertDescription></Alert>
                <FormField control={form.control} name="title_es" render={({ field }) => (
                  <FormItem dir='rtl'><FormLabel>Título de la Campaña (Español)</FormLabel><FormControl><Input {...field} placeholder="Título de la campaña en español" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormItem dir='rtl'>
                  <FormLabel>Descripción de la Campaña (Español)</FormLabel>
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
                    <FormItem dir="rtl">
                      <FormLabel>المبلغ المستهدف ($) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                          placeholder="أدخل المبلغ المستهدف ($)"
                        />
                      </FormControl>
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
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
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
                name="currentAmount"
                render={({ field }) => (
                  <FormItem dir="rtl">
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
                        placeholder="أدخل رابط الفيديو (YouTube أو Facebook)"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {!loading &&
              shareCountsSeed !== undefined &&
              form.watch('fundraisingMode') === 'SHARES' && (
                <div className="mt-6">
                  <SuggestedShareCountsSection
                    ref={suggestedShareCountsRef}
                    key={`${params?.id}-shares`}
                    initialConfig={shareCountsSeed}
                  />
                </div>
              )}
            {!loading &&
              suggestedSeed !== undefined &&
              form.watch('fundraisingMode') === 'AMOUNT' && (
                <div className="mt-6">
                  <SuggestedDonationsSection
                    ref={suggestedDonationsRef}
                    key={`${params?.id}-amount`}
                    initialConfig={suggestedSeed}
                  />
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
                  <FormLabel>صور المشروع</FormLabel>
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
                        يمكنك رفع حتى 5 صور للمشروع. الصورة الأولى ستكون الصورة الرئيسية.
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
                      تحديد ما إذا كانت المشروع نشطة أم لا
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
                تحذير: المشروع غير نشطة حالياً. لن يتمكن المستخدمون من رؤيتها أو التبرع لها.
              </AlertDescription>
            </Alert>
          )}

          {/* ✅ Campaign Updates Section with Translations */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">إنجازات المشروع</h2>
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
                        <TabsList className="flex flex-wrap gap-1">
                          <TabsTrigger value="ar"><ReactCountryFlag countryCode="SA" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> العربية</TabsTrigger>
                          <TabsTrigger value="en"><ReactCountryFlag countryCode="GB" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> English</TabsTrigger>
                          <TabsTrigger value="fr"><ReactCountryFlag countryCode="FR" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Français</TabsTrigger>
                          <TabsTrigger value="tr"><ReactCountryFlag countryCode="TR" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Türkçe</TabsTrigger>
                          <TabsTrigger value="id"><ReactCountryFlag countryCode="ID" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Bahasa</TabsTrigger>
                          <TabsTrigger value="pt"><ReactCountryFlag countryCode="PT" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Português</TabsTrigger>
                          <TabsTrigger value="es"><ReactCountryFlag countryCode="ES" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Español</TabsTrigger>
                        </TabsList>
                        <TabsContent value="ar" className="space-y-4">
                          <FormField control={updateForm.control} name="title" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>عنوان التحديث *</FormLabel><FormControl><Input {...field} placeholder="أدخل عنوان التحديث" /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={updateForm.control} name="description" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>وصف التحديث *</FormLabel><FormControl><Textarea {...field} placeholder="اكتب وصف التحديث..." className="min-h-[100px]" /></FormControl><FormMessage /></FormItem>
                          )} />
                        </TabsContent>
                        <TabsContent value="en" className="space-y-4">
                          <FormField control={updateForm.control} name="title_en" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Update Title (English)</FormLabel><FormControl><Input {...field} placeholder="Enter update title in English" /></FormControl></FormItem>
                          )} />
                          <FormField control={updateForm.control} name="description_en" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Update Description (English)</FormLabel><FormControl><Textarea {...field} placeholder="Write update description in English..." className="min-h-[100px]" /></FormControl></FormItem>
                          )} />
                        </TabsContent>
                        <TabsContent value="fr" className="space-y-4">
                          <FormField control={updateForm.control} name="title_fr" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Titre de la mise à jour (Français)</FormLabel><FormControl><Input {...field} placeholder="Entrez le titre en français" /></FormControl></FormItem>
                          )} />
                          <FormField control={updateForm.control} name="description_fr" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Description (Français)</FormLabel><FormControl><Textarea {...field} placeholder="Description en français..." className="min-h-[100px]" /></FormControl></FormItem>
                          )} />
                        </TabsContent>
                        <TabsContent value="tr" className="space-y-4">
                          <FormField control={updateForm.control} name="title_tr" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Güncelleme Başlığı (Türkçe)</FormLabel><FormControl><Input {...field} placeholder="Türkçe başlık" /></FormControl></FormItem>
                          )} />
                          <FormField control={updateForm.control} name="description_tr" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Açıklama (Türkçe)</FormLabel><FormControl><Textarea {...field} placeholder="Türkçe açıklama..." className="min-h-[100px]" /></FormControl></FormItem>
                          )} />
                        </TabsContent>
                        <TabsContent value="id" className="space-y-4">
                          <FormField control={updateForm.control} name="title_id" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Judul Pembaruan (Indonesia)</FormLabel><FormControl><Input {...field} placeholder="Judul dalam Bahasa Indonesia" /></FormControl></FormItem>
                          )} />
                          <FormField control={updateForm.control} name="description_id" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Deskripsi (Indonesia)</FormLabel><FormControl><Textarea {...field} placeholder="Deskripsi dalam Bahasa Indonesia..." className="min-h-[100px]" /></FormControl></FormItem>
                          )} />
                        </TabsContent>
                        <TabsContent value="pt" className="space-y-4">
                          <FormField control={updateForm.control} name="title_pt" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Título da Atualização (Português)</FormLabel><FormControl><Input {...field} placeholder="Título em português" /></FormControl></FormItem>
                          )} />
                          <FormField control={updateForm.control} name="description_pt" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Descrição (Português)</FormLabel><FormControl><Textarea {...field} placeholder="Descrição em português..." className="min-h-[100px]" /></FormControl></FormItem>
                          )} />
                        </TabsContent>
                        <TabsContent value="es" className="space-y-4">
                          <FormField control={updateForm.control} name="title_es" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Título de la Actualización (Español)</FormLabel><FormControl><Input {...field} placeholder="Título en español" /></FormControl></FormItem>
                          )} />
                          <FormField control={updateForm.control} name="description_es" render={({ field }) => (
                            <FormItem dir='rtl'><FormLabel>Descripción (Español)</FormLabel><FormControl><Textarea {...field} placeholder="Descripción en español..." className="min-h-[100px]" /></FormControl></FormItem>
                          )} />
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
                const hasTrans = (lc: string) => !!update.translations?.find(t => t.locale === lc)?.title;
                const badges = [
                  { lc: 'en', label: 'EN', cls: 'bg-[#025EB8]/10 text-[#025EB8]' },
                  { lc: 'fr', label: 'FR', cls: 'bg-purple-100 text-purple-700' },
                  { lc: 'tr', label: 'TR', cls: 'bg-red-100 text-red-700' },
                  { lc: 'id', label: 'ID', cls: 'bg-orange-100 text-orange-700' },
                  { lc: 'pt', label: 'PT', cls: 'bg-green-100 text-green-700' },
                  { lc: 'es', label: 'ES', cls: 'bg-yellow-100 text-yellow-700' },
                ];

                return (
                  <Card key={update.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{update.title}</h3>
                          <div className="flex gap-1 flex-wrap">
                            {badges.map(b => hasTrans(b.lc) && (
                              <span key={b.lc} className={`text-xs px-2 py-0.5 rounded ${b.cls}`}>{b.label}</span>
                            ))}
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
                          <div className="text-[#025EB8] hover:underline">
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
                  <p>لا توجد إنجازات بعد. قم بإضافة تحديث لإبقاء المتبرعين على اطلاع.</p>
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
              className="bg-[#025EB8] hover:bg-[#014fa0]"
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
                  <TabsList className="flex flex-wrap gap-1">
                    <TabsTrigger value="ar"><ReactCountryFlag countryCode="SA" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> العربية</TabsTrigger>
                    <TabsTrigger value="en"><ReactCountryFlag countryCode="GB" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> English</TabsTrigger>
                    <TabsTrigger value="fr"><ReactCountryFlag countryCode="FR" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Français</TabsTrigger>
                    <TabsTrigger value="tr"><ReactCountryFlag countryCode="TR" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Türkçe</TabsTrigger>
                    <TabsTrigger value="id"><ReactCountryFlag countryCode="ID" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Bahasa</TabsTrigger>
                    <TabsTrigger value="pt"><ReactCountryFlag countryCode="PT" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Português</TabsTrigger>
                    <TabsTrigger value="es"><ReactCountryFlag countryCode="ES" svg style={{width:"1em",height:"1em",verticalAlign:"middle"}} /> Español</TabsTrigger>
                  </TabsList>
                  <TabsContent value="ar" className="space-y-4">
                    <FormField control={updateForm.control} name="title" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>عنوان التحديث *</FormLabel><FormControl><Input {...field} placeholder="أدخل عنوان التحديث" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={updateForm.control} name="description" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>وصف التحديث *</FormLabel><FormControl><Textarea {...field} placeholder="اكتب وصف التحديث..." className="min-h-[100px]" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </TabsContent>
                  <TabsContent value="en" className="space-y-4">
                    <FormField control={updateForm.control} name="title_en" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Update Title (English)</FormLabel><FormControl><Input {...field} placeholder="Enter update title in English" /></FormControl></FormItem>
                    )} />
                    <FormField control={updateForm.control} name="description_en" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Update Description (English)</FormLabel><FormControl><Textarea {...field} placeholder="Write update description in English..." className="min-h-[100px]" /></FormControl></FormItem>
                    )} />
                  </TabsContent>
                  <TabsContent value="fr" className="space-y-4">
                    <FormField control={updateForm.control} name="title_fr" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Titre de la mise à jour (Français)</FormLabel><FormControl><Input {...field} placeholder="Entrez le titre en français" /></FormControl></FormItem>
                    )} />
                    <FormField control={updateForm.control} name="description_fr" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Description (Français)</FormLabel><FormControl><Textarea {...field} placeholder="Description en français..." className="min-h-[100px]" /></FormControl></FormItem>
                    )} />
                  </TabsContent>
                  <TabsContent value="tr" className="space-y-4">
                    <FormField control={updateForm.control} name="title_tr" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Güncelleme Başlığı (Türkçe)</FormLabel><FormControl><Input {...field} placeholder="Türkçe başlık" /></FormControl></FormItem>
                    )} />
                    <FormField control={updateForm.control} name="description_tr" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Açıklama (Türkçe)</FormLabel><FormControl><Textarea {...field} placeholder="Türkçe açıklama..." className="min-h-[100px]" /></FormControl></FormItem>
                    )} />
                  </TabsContent>
                  <TabsContent value="id" className="space-y-4">
                    <FormField control={updateForm.control} name="title_id" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Judul Pembaruan (Indonesia)</FormLabel><FormControl><Input {...field} placeholder="Judul dalam Bahasa Indonesia" /></FormControl></FormItem>
                    )} />
                    <FormField control={updateForm.control} name="description_id" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Deskripsi (Indonesia)</FormLabel><FormControl><Textarea {...field} placeholder="Deskripsi dalam Bahasa Indonesia..." className="min-h-[100px]" /></FormControl></FormItem>
                    )} />
                  </TabsContent>
                  <TabsContent value="pt" className="space-y-4">
                    <FormField control={updateForm.control} name="title_pt" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Título da Atualização (Português)</FormLabel><FormControl><Input {...field} placeholder="Título em português" /></FormControl></FormItem>
                    )} />
                    <FormField control={updateForm.control} name="description_pt" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Descrição (Português)</FormLabel><FormControl><Textarea {...field} placeholder="Descrição em português..." className="min-h-[100px]" /></FormControl></FormItem>
                    )} />
                  </TabsContent>
                  <TabsContent value="es" className="space-y-4">
                    <FormField control={updateForm.control} name="title_es" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Título de la Actualización (Español)</FormLabel><FormControl><Input {...field} placeholder="Título en español" /></FormControl></FormItem>
                    )} />
                    <FormField control={updateForm.control} name="description_es" render={({ field }) => (
                      <FormItem dir='rtl'><FormLabel>Descripción (Español)</FormLabel><FormControl><Textarea {...field} placeholder="Descripción en español..." className="min-h-[100px]" /></FormControl></FormItem>
                    )} />
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