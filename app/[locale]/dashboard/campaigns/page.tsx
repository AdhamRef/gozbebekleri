'use client';

import { useState, useEffect } from 'react';
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
import { useRouter } from "@/i18n/routing";
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [progressFilter, setProgressFilter] = useState<'all' | 'completed' | 'ongoing'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campaignsRes, categoriesRes] = await Promise.all([
          axios.get('/api/campaigns/all'),
          axios.get('/api/categories')
        ]);
        setCampaigns(campaignsRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      toast.success('Campaign deleted successfully');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
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
    } catch (error) {
      console.error('Error deleting campaigns:', error);
      toast.error('Failed to delete campaigns');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الحملات</h1>
          <p className="text-gray-600">إدارة حملات التبرع</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/dashboard/campaigns/new')}
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
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="البحث في الحملات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">متوقف</SelectItem>
              </SelectContent>
            </Select>
            <Select value={progressFilter} onValueChange={(value: any) => setProgressFilter(value)}>
              <SelectTrigger className="w-[180px]">
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
      <Card>
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
                  className="w-5 h-5 rounded border border-gray-300 text-blue-600 focus:ring-blue-500"
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
                    className="rounded border-gray-300"
                  />
                </TableCell>
                <TableCell className="font-medium">{campaign.title}</TableCell>
                <TableCell>{campaign.category.name}</TableCell>
                <TableCell>€{campaign.targetAmount.toLocaleString()}</TableCell>
                <TableCell>€{campaign.currentAmount.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full"
                      style={{ width: `${Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 mt-1">
                    {Math.round((campaign.currentAmount / campaign.targetAmount) * 100)}%
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    campaign.isActive 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-700'
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

        {/* Pagination */}
        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-gray-600">
            Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, filteredCampaigns.length)} of {filteredCampaigns.length} campaigns
          </div>
          <div className="flex gap-2">
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
  <div className="space-y-6">
    <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
    <div className="h-16 bg-gray-200 rounded-lg animate-pulse" />
    <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
  </div>
); 