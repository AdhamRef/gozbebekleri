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
import { Loader2, ArrowLeft, X, Upload, AlertCircle, Plus, Trash2, Edit3, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const formSchema = z.object({
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
  currentAmount: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

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
}

export default function EditCampaignPage({ params }: { params: { id: string } }) {
  const router = useRouter();
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
    },
  });

  const updateForm = useForm({
    defaultValues: {
      title: '',
      description: '',
      videoUrl: '',
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!params?.id) return;
      
      try {
        const [campaignRes, categoriesRes] = await Promise.all([
          axios.get(`/api/campaigns/${params.id}`),
          axios.get('/api/categories')
        ]);

        console.log(campaignRes.data);

        const campaign = campaignRes.data;
        setCategories(categoriesRes.data);

        form.reset({
          title: campaign.title,
          description: campaign.description,
          targetAmount: campaign.targetAmount,
          currentAmount: campaign.currentAmount,
          categoryId: campaign.category.id,
          isActive: campaign.isActive,
          images: campaign.images,
          videoUrl: campaign.videoUrl || '',
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
  }, [params.id, form, router]);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const response = await axios.get(`/api/campaigns/${params.id}/updates`);
        setUpdates(response.data);
      } catch (error) {
        console.error('Error fetching updates:', error);
        toast.error('فشل في تحميل التحديثات');
      }
    };

    fetchUpdates();
  }, [params.id]);

  const onSubmit = async (values: FormValues) => {
    if (!params?.id) return;
    
    setSaving(true);
    try {
      await axios.patch(`/api/campaigns/${params.id}`, values);
      toast.success('تم تحديث الحملة بنجاح');
      router.push('/dashboard/campaigns');
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
      
      // Extract public_id from Cloudinary URL
      const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
      if (publicId) {
        // Delete from Cloudinary
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

  const handleAddUpdate = async (data: any) => {
    try {
      setUpdateLoading(true);
      const response = await axios.post(`/api/campaigns/${params.id}/updates`, {
        ...data,
        image: updateImage
      });

      setUpdates(prev => [response.data, ...prev]);
      updateForm.reset();
      setUpdateImage('');
      setIsUpdateDialogOpen(false);
      toast.success('تم إضافة التحديث بنجاح');
    } catch (error) {
      console.error('Error adding update:', error);
      toast.error('فشل في إضافة التحديث');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleEditUpdate = async (id: string, data: any) => {
    setUpdateLoading(true);
    try {
      const response = await axios.patch(`/api/campaigns/${params.id}/updates/${id}`, {
        ...data,
        image: updateImage || data.image
      });
      setUpdates(updates.map(update => update.id === id ? response.data : update));
      setIsEditUpdateDialogOpen(false);
      setSelectedUpdate(null);
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
          <h1 className="text-2xl font-bold text-gray-800">تعديل الحملة</h1>
          <p className="text-gray-600">قم بتحديث معلومات الحملة</p>
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
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">المعلومات الأساسية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان الحملة</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل عنوان الحملة" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القسم</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
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

              {/* Target Amount */}
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ المستهدف</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        placeholder="أدخل المبلغ المستهدف"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current Amount */}
              <FormField
                control={form.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem>
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

              {/* Video URL */}
              <FormField
                control={form.control}
                name="videoUrl"
                render={({ field }) => (
                  <FormItem>
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

          {/* Description */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>وصف الحملة</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="اكتب وصفاً تفصيلياً للحملة..."
                      className="min-h-[300px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    يمكنك كتابة وصف تفصيلي للحملة. يدعم النص العربي والإنجليزي.
                  </FormDescription>
                </FormItem>
              )}
            />
          </Card>

          {/* Images */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
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

          {/* Warning for inactive campaigns */}
          {!form.getValues('isActive') && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                تحذير: الحملة غير نشطة حالياً. لن يتمكن المستخدمون من رؤيتها أو التبرع لها.
              </AlertDescription>
            </Alert>
          )}

          {/* Campaign Updates Section */}
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
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>إضافة تحديث جديد</DialogTitle>
                  </DialogHeader>
                  <Form {...updateForm}>
                    <form onSubmit={updateForm.handleSubmit(handleAddUpdate)} className="space-y-4">
                      <FormField
                        control={updateForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>عنوان التحديث</FormLabel>
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
                          <FormItem>
                            <FormLabel>وصف التحديث</FormLabel>
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
                              className="h-48 w-48 object-cover rounded-lg"
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
                          <FormItem>
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
                          onClick={() => setIsUpdateDialogOpen(false)}
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
              {updates.map((update) => (
                <Card key={update.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{update.title}</h3>
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
                        {format(new Date(update.createdAt), 'PPP', { locale: ar })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUpdate(update);
                          setIsEditUpdateDialogOpen(true);
                        }}
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
              ))}
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>تعديل التحديث</DialogTitle>
          </DialogHeader>
          {selectedUpdate && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => handleEditUpdate(selectedUpdate.id, {
                ...data,
                image: updateImage || selectedUpdate.image
              }))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان التحديث</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل عنوان التحديث" />
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
                      <FormLabel>وصف التحديث</FormLabel>
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
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رابط الصورة (اختياري)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل رابط الصورة" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
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