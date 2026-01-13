'use client';

import { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'react-hot-toast';
import { ArrowUpDown, Crown, GripVertical, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from 'axios';

interface Campaign {
  id: string;
  title: string;
  order: number;
}

interface DraggableCampaignProps {
  campaign: Campaign;
  index: number;
  moveCampaign: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableCampaign = ({ campaign, index, moveCampaign }: DraggableCampaignProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'CAMPAIGN',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'CAMPAIGN',
    hover: (item: { index: number }) => {
      if (item.index === index) return;
      moveCampaign(item.index, index);
      item.index = index;
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`flex items-center gap-3 p-3 bg-white border rounded-lg mb-2 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
      <span className="flex-1">{campaign.title}</span>
      <span className="text-sm text-gray-500">#{index + 1}</span>
    </div>
  );
};

export const CampaignReorderDialog = ({ onReorder }: { onReorder: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Campaign[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get('/api/campaigns/all');
        setCampaigns(response.data);

        // Fetch prioritized campaigns
        const mainResponse = await axios.get('/api/campaigns/main');
        setSelectedCampaigns(mainResponse.data); // Set prioritized campaigns as selected
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        // toast.error('فشل في تحميل الحملات');
      }
    };

    fetchCampaigns();
  }, []);

  const handleSelectCampaign = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    if (selectedCampaigns.length >= 5) {
      toast.error('يمكنك اختيار 5 حملات كحد أقصى');
      return;
    }

    if (selectedCampaigns.some(c => c.id === campaignId)) {
      toast.error('هذه الحملة مضافة بالفعل');
      return;
    }

    setSelectedCampaigns((prev) => [...prev, campaign]);
  };

  const removeCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => prev.filter(c => c.id !== campaignId));
  };

  const moveCampaign = (dragIndex: number, hoverIndex: number) => {
    const draggedCampaign = selectedCampaigns[dragIndex];
    const newCampaigns = [...selectedCampaigns];
    newCampaigns.splice(dragIndex, 1);
    newCampaigns.splice(hoverIndex, 0, draggedCampaign);
    setSelectedCampaigns(newCampaigns);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const updatedCampaigns = selectedCampaigns.map((campaign, index) => ({
        id: campaign.id,
        order: index,
      }));

      await axios.post('/api/campaigns/reorder', {
        campaigns: updatedCampaigns,
      });

      toast.success('تم إعادة ترتيب الحملات بنجاح');
      onReorder();
      setIsOpen(false);
    } catch (error) {
      console.error('Error reordering campaigns:', error);
      // toast.error('فشل في إعادة ترتيب الحملات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Crown className="w-4 h-4" />
          أولويات الحملات
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إعادة ترتيب الحملات</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">
            اختر الحملات التي تريد عرضها في القائمة المميزة. يفضل اختيار 5 حملات كحد أقصى.
            <br />
            <span className="text-xs mt-1 block">
              ({selectedCampaigns.length}/5 حملات مختارة)
            </span>
          </p>
          
          <Select onValueChange={handleSelectCampaign}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="اختر حملة لإضافتها" />
            </SelectTrigger>
            <SelectContent>
              {campaigns
                .filter(campaign => !selectedCampaigns.some(sc => sc.id === campaign.id))
                .map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DndProvider backend={HTML5Backend}>
            <div className="mt-4 space-y-2">
              {selectedCampaigns.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  لم يتم اختيار أي حملات بعد
                </p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  {selectedCampaigns.map((campaign, index) => (
                    <div key={campaign.id} className="relative">
                      <DraggableCampaign
                        campaign={campaign}
                        index={index}
                        moveCampaign={moveCampaign}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 left-2 h-6 w-6 p-0"
                        onClick={() => removeCampaign(campaign.id)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DndProvider>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || selectedCampaigns.length === 0}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            حفظ الترتيب
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 