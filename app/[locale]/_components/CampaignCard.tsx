import React from "react";
import { Clock } from "lucide-react";

// CampaignCard Component
const CampaignCard = ({ campaign, onClick }) => {
  const formatNumber = (num) => {
    return num.toLocaleString('ar-EG');
  };

  const progress = (campaign.currentAmount / campaign.targetAmount) * 100;

  return (
    <div
      onClick={() => onClick(campaign.id)}
      className="min-w-[300px] transition-all duration-300 cursor-pointer hover:-translate-y-1"
    >
      <div className="relative h-48 overflow-hidden rounded-lg shadow-md">
        <img
          src={campaign.images[0]}
          alt={campaign.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 bg-sky-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
          {progress.toFixed(0)}%
        </div>
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-md">
          {campaign.contributors} متبرع
        </div>
      </div>

      <div className="py-4">
        <h3 className="text-base font-bold text-gray-900 mb-3 line-clamp-1">
          {campaign.title}
        </h3>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-700">
              <span className="font-bold text-sky-600">
                {formatNumber(campaign.currentAmount)} ₺
              </span>
              {" "}تبرعات
            </span>
            <span className="text-gray-600">
              تبقى{" "}
              <span className="font-semibold">
                {formatNumber(campaign.targetAmount - campaign.currentAmount)} ₺
              </span>
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-sky-500 to-sky-600 h-2 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {campaign.daysLeft} يوم متبقي
          </span>
          <span className="bg-sky-50 text-sky-700 px-2 py-1 rounded-full font-medium">
            {campaign.category}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;