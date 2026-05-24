'use client'
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import EditDialog from '../_components/EditDialog'; // Assuming EditDialog is in a separate file
import { User, Mail, Globe, Phone, Calendar } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

const AccountPage = () => {
  const { data: session } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`/api/users/${session?.user?.id}`);
        setUser(response.data.user);
      } catch (err) {
        setError("Failed to fetch user data");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchUserData();
    }
  }, [session]);

  const handleUpdateField = async (field, value) => {
    try {
      await axios.put(`/api/users/${session.user.id}`, {
        [field]: value,
      });
      setUser((prevUser) => ({ ...prevUser, [field]: value }));
      toast.success("تم تحديث المعلومات بنجاح");
    } catch (error) {
      toast.error("فشل تحديث المعلومات");
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <Toaster />
      <h1 className="text-2xl font-bold mb-6">معلومات الحساب</h1>
      <EditDialog
        title="الاسم"
        value={user.name}
        onSave={(value) => handleUpdateField("name", value)}
        icon={User}
      />
      <EditDialog
        title="البريد الإلكتروني"
        value={user.email}
        onSave={(value) => handleUpdateField("email", value)}
        icon={Mail}
      />
      <EditDialog
        title="البلد"
        value={user.country}
        onSave={(value) => handleUpdateField("country", value)}
        icon={Globe}
      />
      <EditDialog
        title="رقم الهاتف"
        value={user.phone}
        onSave={(value) => handleUpdateField("phone", value)}
        type="tel"
        icon={Phone}
      />
      <EditDialog
        title="تاريخ الميلاد"
        value={user.birthdate}
        onSave={(value) => handleUpdateField("birthdate", value)}
        type="date"
        icon={Calendar}
      />
      <Button variant="destructive" onClick={() => {/* Handle account deletion */}}>
        حذف الحساب
      </Button>
    </div>
  );
};

export default AccountPage; 