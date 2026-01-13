'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from "@/i18n/routing";
import { useState, useEffect } from 'react';
import { Link } from "@/i18n/routing";
import { 
  LayoutDashboard, 
  Heart, 
  FolderOpen, 
  Users, 
  Settings,
  LogOut,
  Menu,
  X,
  PenLine,
  HandCoins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <LoadingSkeleton />;
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }

  const menuItems = [
    {
      title: 'لوحة التحكم',
      icon: <LayoutDashboard className="w-5 h-5" />,
      href: '/dashboard'
    },
    {
      title: 'الحملات',
      icon: <Heart className="w-5 h-5" />,
      href: '/dashboard/campaigns'
    },
    {
      title: 'الأقسام',
      icon: <FolderOpen className="w-5 h-5" />,
      href: '/dashboard/categories'
    },
    {
      title: 'التبرعات',
      icon: <HandCoins className="w-5 h-5" />,
      href: '/dashboard/donations'
    },
    {
      title: 'المدونة',
      icon: <PenLine className="w-5 h-5" />,
      href: '/dashboard/blog'
    },
    {
      title: 'المستخدمين',
      icon: <Users className="w-5 h-5" />,
      href: '/dashboard/users'
    },
    {
      title: 'الإعدادات',
      icon: <Settings className="w-5 h-5" />,
      href: '/dashboard/settings'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100" >
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-white"
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 right-0 z-40 w-64  pt-12 h-screen transition-transform 
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="h-full px-3 py-[70px] overflow-y-auto bg-white border-l">
 
          
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="absolute bottom-4 left-4 right-4">
            <Button
              onClick={() => signOut({ callbackUrl: '/' })}
              variant="ghost"
              className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              تسجيل خروج
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`p-4 lg:mr-64 ${isSidebarOpen ? 'mr-64' : 'mr-0'}`}>
        <div className="rounded-lg bg-white p-8 shadow-sm min-h-[calc(100vh-2rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
  </div>
);
