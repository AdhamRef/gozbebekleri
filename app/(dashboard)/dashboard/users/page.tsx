"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Pencil, Search } from "lucide-react";

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchEmail, setSearchEmail] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("/api/users");
        setUsers(response.data.users);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("فشل في تحميل المستخدمين");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
  };

  const handleUserUpdate = async (updatedUser) => {
    try {
      await axios.put(`/api/users/${updatedUser.id}`, updatedUser);
      toast.success("تم تحديث المستخدم بنجاح");
      setUsers(
        users.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      );
      handleDialogClose();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("فشل في تحديث المستخدم");
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[12rem]">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-0 sm:p-2">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">إدارة المستخدمين</h1>
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="ابحث بواسطة البريد الإلكتروني"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          className="pl-4 pr-10 w-full"
        />
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">اسم</TableHead>
              <TableHead className="text-start">البريد الإلكتروني</TableHead>
              <TableHead className="text-start">الدور</TableHead>
              <TableHead className="text-start">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => handleEditClick(user)}>
                    <Pencil className="w-3 h-3" /> تعديل
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogOverlay className="fixed inset-0 bg-black/50" />
        <DialogContent className="fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md p-4 sm:p-6 transform -translate-x-1/2 -translate-y-1/2 bg-card text-card-foreground border border-border rounded-lg shadow-lg">
          <DialogTitle className="text-lg font-bold text-foreground">
            تعديل المستخدم
          </DialogTitle>
          {selectedUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUserUpdate(selectedUser);
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="name">اسم</Label>
                <Input
                  id="name"
                  placeholder="اسم"
                  value={selectedUser.name}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  placeholder="البريد الإلكتروني"
                  value={selectedUser.email}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">الدور</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) =>
                    setSelectedUser({ ...selectedUser, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DONOR">DONOR</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={handleDialogClose}
                  className="mr-2"
                >
                  إلغاء
                </Button>
                <Button type="submit">تحديث المستخدم</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default UsersPage;
