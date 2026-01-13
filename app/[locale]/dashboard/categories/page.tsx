'use client';

import { useEffect, useState } from 'react';
import { useRouter } from "@/i18n/routing";
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Plus, Pencil, Trash2, Loader2, ArrowUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ReorderDialog } from './_components/ReorderDialog';

interface Category {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  campaigns: {
    id: string;
  }[];
  order: number;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Category>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [campaignsFilter, setCampaignsFilter] = useState<'all' | 'with' | 'without'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [itemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories/detailed');
      console.log(response.data.items)
      setCategories(response.data.items);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('فشل في تحميل الأقسام');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Category) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (category: Category) => {
    if (category.campaigns.length > 0) {
      toast.error('لا يمكن حذف قسم يحتوي على حملات');
      return;
    }
    setCategoryToDelete(category);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedCategories.length} قسم؟`)) return;
    
    setDeleteLoading(true);
    try {
      await Promise.all(
        selectedCategories.map(id => axios.delete(`/api/categories/${id}`))
      );
      toast.success('تم حذف الأقسام المحددة بنجاح');
      fetchCategories();
      setSelectedCategories([]);
    } catch (error) {
      console.error('Error deleting categories:', error);
      toast.error('فشل في حذف الأقسام');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    setDeleteLoading(true);
    try {
      await axios.delete(`/api/categories/${categoryToDelete.id}`);
      toast.success('تم حذف القسم بنجاح');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('فشل في حذف القسم');
    } finally {
      setDeleteLoading(false);
      setCategoryToDelete(null);
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSelectAllCategories = () => {
    if (selectedCategories.length === filteredCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(filteredCategories.map(category => category.id));
    }
  };

  // Filter categories based on search and filters
  const filteredCategories = categories.filter(category => {
    const matchesSearch = 
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesCampaignsFilter = 
      campaignsFilter === 'all' ||
      (campaignsFilter === 'with' && category.campaigns.length > 0) ||
      (campaignsFilter === 'without' && category.campaigns.length === 0);

    return matchesSearch && matchesCampaignsFilter;
  });

  // Sort categories
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (sortField === 'name') {
      return sortDirection === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedCategories.length / itemsPerPage);
  const paginatedCategories = sortedCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الأقسام</h1>
          <p className="text-gray-600">إدارة أقسام الحملات</p>
        </div>
        <div className="flex gap-3">
  {selectedCategories.length > 0 && (
    <Button
      variant="destructive"
      onClick={handleBulkDelete}
      disabled={deleteLoading}
      className="gap-2"
    >
      {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      حذف ({selectedCategories.length})
    </Button>
  )}
  <ReorderDialog 
    categories={categories} 
    onReorder={fetchCategories} 
  />
  <Button
    onClick={() => router.push('/dashboard/categories/new')}
    className="bg-emerald-600 hover:bg-emerald-700 gap-2"
  >
    <Plus className="w-4 h-4" />
    قسم جديد
  </Button>
</div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="ابحث عن قسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-4 pr-10"
          />
        </div>
        <Select
          value={campaignsFilter}
          onValueChange={(value: 'all' | 'with' | 'without') => setCampaignsFilter(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="الحملات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأقسام</SelectItem>
            <SelectItem value="with">أقسام بها حملات</SelectItem>
            <SelectItem value="without">أقسام بدون حملات</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedCategories.length === filteredCategories.length}
                  onChange={handleSelectAllCategories}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  اسم القسم
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </TableHead>
              <TableHead className="text-start">الوصف</TableHead>
              <TableHead className="text-start">عدد الحملات</TableHead>
              <TableHead className="text-start">الصورة</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>

            {paginatedCategories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleSelectCategory(category.id)}
                    className="rounded border-gray-300"
                  />
                </TableCell>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className='max-w-[300px] truncate pl-12'>{category.description || 'لا يوجد وصف'}</TableCell>
                <TableCell>{category.campaigns.length}</TableCell>
                <TableCell>
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    'لا توجد صورة'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/dashboard/categories/edit/${category.id}`)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(category)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={category.campaigns.length > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {paginatedCategories.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-gray-500">لا توجد أقسام</p>
                  <Button
                    variant="link"
                    onClick={() => router.push('/dashboard/categories/new')}
                    className="mt-2"
                  >
                    إضافة قسم جديد
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                السابق
              </Button>
              <span className="text-sm text-gray-600">
                صفحة {currentPage} من {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                التالي
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              إجمالي النتائج: {sortedCategories.length}
            </div>
          </div>
        )}
      </div>

      <AlertDialog 
        open={!!categoryToDelete} 
        onOpenChange={() => setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا القسم؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف القسم نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 gap-2"
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-gray-200 rounded-md animate-pulse" />
        <div className="h-4 w-48 bg-gray-200 rounded-md animate-pulse" />
      </div>
      <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse" />
    </div>

    <div className="flex gap-4 mb-6">
      <div className="h-10 flex-1 bg-gray-200 rounded-md animate-pulse" />
      <div className="h-10 w-[180px] bg-gray-200 rounded-md animate-pulse" />
    </div>

    <div className="bg-white rounded-lg shadow">
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-1/6 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-10 w-1/6 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-10 w-1/6 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-10 w-1/6 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-10 w-1/6 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-10 w-1/6 bg-gray-200 rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </div>
); 