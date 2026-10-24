import { Link, usePathname, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { museumAssets } from './assets.generated';
import { ms } from './theme';

export const publicNavigation = [
  { href: '/', label: 'Trang chủ' }, { href: '/kham-pha', label: 'Khám phá' },
  { href: '/thuyet-minh', label: 'Thuyết minh' }, { href: '/ve-bao-tang', label: 'Về bảo tàng' },
] as const;

export function MuseumLink({ href, children, primary = false, selected = false, inverse = false }: { href: Href; children: string; primary?: boolean; selected?: boolean; inverse?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <Link href={href} asChild><Pressable accessibilityRole="link" accessibilityState={{ selected }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [ms.link, primary && ms.primary, selected && ms.selected, pressed && (primary || inverse ? ms.primaryPressed : ms.pressed), focused && ms.focus]}><Text style={[ms.linkText, (primary || inverse) && ms.whiteText]}>{children}</Text></Pressable></Link>;
}

export function MuseumImage({ path, alt, poster = false }: { path: string; alt: string; poster?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed || !museumAssets[path]) return <View accessible accessibilityLabel={alt} style={[ms.image, poster && ms.poster, ms.fallback]}><Text style={ms.small}>Không thể tải hình ảnh.</Text></View>;
  return <Image source={museumAssets[path]} accessibilityLabel={alt} accessible resizeMode="cover" onError={() => setFailed(true)} style={[ms.image, poster && ms.poster]} />;
}

export function MuseumTitle({ title, description, eyebrow }: { title: string; description?: string; eyebrow?: string }) {
  return <View style={ms.section}>{eyebrow && <Text style={ms.eyebrow}>{eyebrow}</Text>}<Text accessibilityRole="header" style={ms.title}>{title}</Text>{description && <Text style={ms.body}>{description}</Text>}</View>;
}

export function MuseumFrame({ children, current }: { children: ReactNode; current?: string }) {
  const pathname = usePathname();
  return <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={ms.safe}><ScrollView style={ms.scroll} contentContainerStyle={ms.content}>
    <View style={ms.header}>
      <Link href="/" asChild><Pressable accessibilityRole="link" accessibilityLabel="Bảo tàng Chứng tích Chiến tranh — Trang chủ" style={ms.link}><Text style={ms.brand}>BẢO TÀNG{'\n'}<Text style={ms.brandSmall}>CHỨNG TÍCH CHIẾN TRANH</Text></Text></Pressable></Link>
      <View style={ms.nav}>{publicNavigation.map(item => <MuseumLink key={item.href} href={item.href} selected={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)}>{item.label}</MuseumLink>)}</View>
      <Text style={ms.small}>Ngôn ngữ giao diện: Tiếng Việt</Text>
      <MuseumLink href="/khong-gian-cua-toi" primary>Không gian của tôi</MuseumLink>
    </View>
    <View style={ms.container}>{current && <View style={ms.row}><MuseumLink href="/">Trang chủ</MuseumLink><Text style={ms.small}>/ {current}</Text></View>}{children}</View>
    <View style={ms.footer}><Text style={[ms.brand, ms.whiteText]}>BẢO TÀNG{'\n'}CHỨNG TÍCH CHIẾN TRANH</Text>{publicNavigation.map(item => <MuseumLink key={item.href} href={item.href} inverse>{item.label}</MuseumLink>)}</View>
  </ScrollView></SafeAreaView>;
}
