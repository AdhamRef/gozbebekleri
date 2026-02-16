"use client";
import React, { useEffect, useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const EditDialog = ({ title, value, onSave, type = "text", icon: Icon }) => {
    const t = useTranslations('Profile.editDialog');
    const [newValue, setNewValue] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
  
    const handleSave = async () => {
      await onSave(newValue);
      setIsOpen(false);
    };
  
    useEffect(() => {
      setNewValue(value);
    }, [value]);
  
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {Icon && <Icon className="w-8 h-8 text-sky-700" />}
              <div className="flex-1 flex flex-col gap-[2px] text-right">
                <p className="text-gray-500 text-sm">{title}</p>
                <p className="text-gray-900 text-[14px]">{newValue || t("notSpecified")}</p>
              </div>
            </div>
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
        </DialogTrigger>
        <DialogContent>
        
            <DialogTitle>{t("editTitle", { title })}</DialogTitle>
       
          <div className="space-y-4 py-4">
            <Input
              type={type}
              value={newValue || ""}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={t("enterPlaceholder", { title })}
            />
            <Button onClick={handleSave} className="w-full">
              {t("saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

export default EditDialog;