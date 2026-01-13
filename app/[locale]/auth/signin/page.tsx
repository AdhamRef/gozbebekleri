'use client';

import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white py-12 px-4 sm:px-6 lg:px-8" >
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            تسجيل دخول
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            قم بتسجيل دخول للمتابعة
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all"
          >
            <img src="/google.svg" alt="Google" className="w-5 h-5" />
            <span>تسجيل دخول باستخدام Google</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => signIn('facebook', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-[#1877F2] hover:bg-[#1874EA] shadow-sm transition-all"
          >
            <img src="/facebook.svg" alt="Facebook" className="w-5 h-5" />
            <span>تسجيل دخول باستخدام Facebook</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
} 