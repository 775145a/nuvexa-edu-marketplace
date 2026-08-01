'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { ShellLoader } from '@/components/layouts/DashboardShell';

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return void router.push('/login');
    authApi.me()
      .then(d => { if (d.data?.role !== 'INSTRUCTOR') router.push('/'); else setAuthed(true); })
      .catch(() => router.push('/login'));
  }, [router]);

  if (!authed) return <ShellLoader />;
  return <>{children}</>;
}
