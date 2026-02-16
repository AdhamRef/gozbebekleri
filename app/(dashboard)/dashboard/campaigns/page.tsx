'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  ArrowUpDown,
  Filter,
  MoreVertical,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { CampaignReorderDialog } from './_components/CampaignReorderDialog';

interface Campaign {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  isActive: boolean;
  createdAt: string;
  category: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Campaign>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const locale = useLocale() as string;
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [progressFilter, setProgressFilter] = useState<'all' | 'completed' | 'ongoing'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    try {
      const lc = locale || 'ar';
      const [campaignsRes, categoriesRes] = await Promise.all([
        axios.get('/api/campaigns/all', { params: { locale: lc } }),
        axios.get('/api/categories', { params: { locale: lc, counts: true, limit: 200 } })
      ]);

      const campaignsData = campaignsRes.data?.items || campaignsRes.data || [];
      const categoriesData = categoriesRes.data?.items || categoriesRes.data || [];

      setCampaigns(campaignsData as Campaign[]);
      setCategories(categoriesData as Category[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [locale]);

  const handleSort = (field: keyof Campaign) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    setDeleteLoading(true);
    try {
      await axios.delete(`/api/campaigns/${id}`);
      setCampaigns(campaigns.filter(campaign => campaign.id !== id));
      toast.success('تم مسح الحملة');
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      const msg = axios.isAxiosError(error) ? error.response?.data?.error || error.message : 'Failed to delete campaign';
      // If server indicates donations exist, offer force-delete
      if (msg && typeof msg === 'string' && msg.toLowerCase().includes('donations')) {
        if (window.confirm('This campaign has donations. Deleting it will remove related donation items. Do you want to proceed?')) {
          try {
            await axios.delete(`/api/campaigns/${id}?force=true`);
            setCampaigns(campaigns.filter(campaign => campaign.id !== id));
            toast.success('تم مسح الحملة');
          } catch (err: any) {
            const m = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Failed to delete campaign';
            toast.error(m);
          }
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedCampaigns.length} campaigns?`)) return;
    
    setDeleteLoading(true);
    try {
      await Promise.all(selectedCampaigns.map(id => axios.delete(`/api/campaigns/${id}`)));
      setCampaigns(campaigns.filter(campaign => !selectedCampaigns.includes(campaign.id)));
      setSelectedCampaigns([]);
      toast.success('Campaigns deleted successfully');
    } catch (error: any) {
      console.error('Error deleting campaigns:', error);
      const msg = axios.isAxiosError(error) ? error.response?.data?.error || error.message : 'Failed to delete campaigns';
      if (msg && typeof msg === 'string' && msg.toLowerCase().includes('donations')) {
        if (window.confirm('Some campaigns have donations. Deleting will remove related donation items. Proceed and force delete?')) {
          try {
            await Promise.all(selectedCampaigns.map(id => axios.delete(`/api/campaigns/${id}?force=true`)));
            setCampaigns(campaigns.filter(campaign => !selectedCampaigns.includes(campaign.id)));
            setSelectedCampaigns([]);
            toast.success('Campaigns deleted successfully');
          } catch (err: any) {
            const m = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Failed to delete campaigns';
            toast.error(m);
          }
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredCampaigns = campaigns
    .filter(campaign => {
      const matchesSearch = campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.category.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || campaign.category.id === selectedCategory;
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && campaign.isActive) ||
        (statusFilter === 'inactive' && !campaign.isActive);
      
      const progress = (campaign.currentAmount / campaign.targetAmount) * 100;
      const matchesProgress = progressFilter === 'all' ||
        (progressFilter === 'completed' && progress >= 100) ||
        (progressFilter === 'ongoing' && progress < 100);
      
      return matchesSearch && matchesCategory && matchesStatus && matchesProgress;
    })
    .sort((a, b) => {
      if (sortDirection === 'asc') {
        return a[sortField] > b[sortField] ? 1 : -1;
      }
      return a[sortField] < b[sortField] ? 1 : -1;
    });

  const paginatedCampaigns = filteredCampaigns.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const exportToCSV = () => {
    const headers = ['Title', 'Category', 'Target Amount', 'Current Amount', 'Status', 'Created At'];
    const csvData = filteredCampaigns.map(campaign => [
      campaign.title,
      campaign.category.name,
      campaign.targetAmount,
      campaign.currentAmount,
      campaign.isActive ? 'Active' : 'Inactive',
      format(new Date(campaign.createdAt), 'PPP', { locale: ar })
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `campaigns_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-0 sm:p-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">الحملات</h1>
          <p className="text-sm text-muted-foreground">إدارة حملات التبرع</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => window.location.href = '/dashboard/campaigns/new'}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            إنشاء حملة جديدة
          </Button>
          <CampaignReorderDialog onReorder={() => fetchData()} />
        </div>
      </div>

      {/* Filters Section */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="البحث في الحملات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="جميع الأقسام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأقسام</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">متوقف</SelectItem>
              </SelectContent>
            </Select>
            <Select value={progressFilter} onValueChange={(value: any) => setProgressFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="التقدم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحملات</SelectItem>
                <SelectItem value="completed">مكتملة</SelectItem>
                <SelectItem value="ongoing">جارية</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="gap-2"
              onClick={exportToCSV}
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Campaigns Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <input
                  type="checkbox"
                  checked={selectedCampaigns.length === paginatedCampaigns.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCampaigns(paginatedCampaigns.map(c => c.id));
                    } else {
                      setSelectedCampaigns([]);
                    }
                  }}
                  className="w-5 h-5 rounded border border-input accent-primary"
                />
              </TableHead>
              <TableHead className="text-right">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('title')}
                  className="hover:bg-transparent p-0 font-bold"
                >
                  عنوان الحملة
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">القسم</TableHead>
              <TableHead className="text-right">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('targetAmount')}
                  className="hover:bg-transparent p-0 font-bold"
                >
                  المبلغ المستهدف
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">المبلغ الحالي</TableHead>
              <TableHead className="text-right">التقدم</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">
                <Button 
                  variant="ghost" 
                  onClick={() => handleSort('createdAt')}
                  className="hover:bg-transparent p-0 font-bold"
                >
                  التاريخ
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCampaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.includes(campaign.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCampaigns([...selectedCampaigns, campaign.id]);
                      } else {
                        setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id));
                      }
                    }}
                    className="rounded border-input accent-primary"
                  />
                </TableCell>
                <TableCell className="font-medium">{campaign.title}</TableCell>
                <TableCell>{campaign.category.name}</TableCell>
                <TableCell>€{campaign.targetAmount.toLocaleString()}</TableCell>
                <TableCell>€{campaign.currentAmount.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="w-full min-w-[4rem] bg-muted rounded-full h-2.5">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {Math.round((campaign.currentAmount / campaign.targetAmount) * 100)}%
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    campaign.isActive 
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {campaign.isActive ? 'نشط' : 'متوقف'}
                  </span>
                </TableCell>
                <TableCell>
                  {format(new Date(campaign.createdAt), 'PPP', { locale: ar })}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/campaign/${campaign.id}`)}>
                          <Eye className="w-4 h-4 ml-2" />
                          عرض
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/campaigns/edit/${campaign.id}`)}>
                          <Edit className="w-4 h-4 ml-2" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(campaign.id)}
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row items-center justify-between p-3 sm:p-4 border-t border-border">
          <div className="text-sm text-muted-foreground order-2 sm:order-1">
            {((page - 1) * itemsPerPage) + 1} – {Math.min(page * itemsPerPage, filteredCampaigns.length)} من {filteredCampaigns.length}
          </div>
          <div className="flex gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page * itemsPerPage >= filteredCampaigns.length}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

const LoadingSkeleton = () => (
  <div className="space-y-4 sm:space-y-6 p-0 sm:p-2">
    <div className="h-16 sm:h-20 bg-muted rounded-lg animate-pulse" />
    <div className="h-14 sm:h-16 bg-muted rounded-lg animate-pulse" />
    <div className="h-64 sm:h-96 bg-muted rounded-lg animate-pulse" />
  </div>
); 