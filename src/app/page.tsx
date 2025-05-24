
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { FullPageLoader } from '@/components/ui/loader';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/landing'); // Changed from /login to /landing
      }
    }
  }, [user, loading, router]);

  return <FullPageLoader />;
}
