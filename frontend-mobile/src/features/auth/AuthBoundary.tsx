import { router, usePathname } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { session } from '../../lib/api';

const publicPaths = new Set(['/login', '/register']);

export function AuthBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [checkedPath, setCheckedPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void session.get().then((tokens) => {
      if (!active) return;
      const isPublic = publicPaths.has(pathname);
      if (!tokens?.accessToken && !isPublic) router.replace('/login');
      else if (tokens?.accessToken && isPublic) router.replace('/dashboard');
      setCheckedPath(pathname);
    });
    return () => { active = false; };
  }, [pathname]);

  return checkedPath === pathname ? children : null;
}
