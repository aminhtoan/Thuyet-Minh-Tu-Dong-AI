import { PlaceholderScreen } from '@/components/common/PlaceholderScreen';

const links = [
  { href: '/login' as const, label: 'Login' },
  { href: '/register' as const, label: 'Register' },
  { href: '/dashboard' as const, label: 'Dashboard' },
  { href: '/projects' as const, label: 'Projects' },
  { href: '/projects/new' as const, label: 'New Project' },
  { href: '/history' as const, label: 'History' },
  { href: '/settings' as const, label: 'Settings' },
];

export function HomeScreen() {
  return <PlaceholderScreen title="Multilingual AI Narration" links={links} />;
}
