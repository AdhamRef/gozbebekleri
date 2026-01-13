'use client';

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Link, useRouter } from "@/i18n/routing";

interface SignInDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignInDialog({ isOpen, onClose }: SignInDialogProps) {
  const router = useRouter();

  const handleSignIn = (provider: string) => {
    const callbackUrl = router.asPath;
    signIn(provider, { callbackUrl });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" >
        <div className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-blue-600/20 z-0" />
          
          {/* Logo and Title */}
          <div className="relative z-10 p-6 text-center">
            <div className="flex justify-center mb-2">
            <img src="https://i.ibb.co/ZwcJcN1/logo.webp" className="h-12" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              مرحباً بك في منصة قرة العيون
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              سجل دخولك للمتابعة ومشاركة الخير
            </p>
          </div>

          {/* Sign In Buttons */}
          <div className="relative z-10 p-6 pt-2 space-y-4 bg-white">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSignIn('google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border border-gray-200 shadow-sm transition-all"
            >
              <img src="/google.svg" alt="Google" className="w-5 h-5" />
              <span>تسجيل دخول باستخدام Google</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSignIn('facebook')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1877F2] hover:bg-[#1874EA] text-white font-medium rounded-xl shadow-sm transition-all"
            >
              <img src="/facebook.svg" alt="Facebook" className="w-5 h-5" />
              <span>تسجيل دخول باستخدام Facebook</span>
            </motion.button>

            {/* Terms and Privacy */}
            <p className="text-xs text-center text-gray-500 mt-6">
              بتسجيل دخولك، فإنك توافق على{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">شروط الاستخدام</Link>
              {' '}و{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">سياسة الخصوصية</Link>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 