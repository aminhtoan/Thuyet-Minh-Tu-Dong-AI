import { Link, usePathname, type Href } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, Text, View, type PressableProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { museumAssets } from './assets.generated';
import { ms } from './theme';

export const publicNavigation = [
  { href: '/', label: 'Trang chủ' }, { href: '/kham-pha', label: 'Khám phá' },
  { href: '/thuyet-minh', label: 'Thuyết minh' }, { href: '/ve-bao-tang', label: 'Về bảo tàng' },
] as const;

export const publicBottomNavigation = [
  { href: '/', label: 'Trang chủ', icon: 'home-outline', activeIcon: 'home' },
  { href: '/kham-pha', label: 'Khám phá', icon: 'compass-outline', activeIcon: 'compass' },
  { href: '/thuyet-minh', label: 'Thuyết minh', icon: 'play-box-outline', activeIcon: 'play-box' },
  { href: '/ve-bao-tang', label: 'Giới thiệu', icon: 'information-outline', activeIcon: 'information' },
  { href: '/khong-gian-cua-toi', label: 'Của tôi', icon: 'account-circle-outline', activeIcon: 'account-circle' },
] as const;

export function publicTabSelected(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
}

type PublicTabProps = { item: typeof publicBottomNavigation[number]; selected: boolean };

// Slot must see a component, not a Pressable style callback that it spreads as an object.
const PublicTabButton = forwardRef<ComponentRef<typeof Pressable>, PressableProps & PublicTabProps>(function PublicTabButton({ item, selected, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return <Pressable {...props} ref={ref} accessibilityRole="link" accessibilityLabel={item.label === 'Của tôi' ? 'Của tôi — Không gian của tôi' : item.label} accessibilityState={{ selected }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [ms.tab, selected && ms.tabSelected, pressed && ms.pressed, focused && ms.focus]}>
      <View style={ms.tabIcon} accessible={false} importantForAccessibility="no-hide-descendants"><MaterialCommunityIcons accessible={false} importantForAccessibility="no" name={selected ? item.activeIcon : item.icon} size={22} color={selected ? ms.tabActiveText.color : ms.tabText.color} /></View>
      <Text style={[ms.tabText, selected && ms.tabActiveText]}>{item.label}</Text>
    </Pressable>;
});

function PublicTab({ item, selected }: PublicTabProps) {
  return <Link href={item.href} asChild><PublicTabButton item={item} selected={selected} /></Link>;
}

export function MuseumBottomNavigation() {
  const pathname = usePathname();
  return <View accessibilityLabel="Điều hướng bảo tàng" style={ms.bottomNavigation}>
    <View style={ms.bottomNavigationRow}>{publicBottomNavigation.map(item => <PublicTab key={item.href} item={item} selected={publicTabSelected(pathname, item.href)} />)}</View>
  </View>;
}

export function MuseumLink({ href, children, primary = false, selected = false, inverse = false, outlined = false, homeCta }: { href: Href; children: string; primary?: boolean; selected?: boolean; inverse?: boolean; outlined?: boolean; homeCta?: 'light' | 'outline' | 'primary' }) {
  const [focused, setFocused] = useState(false);
  return <Link href={href} asChild><Pressable accessibilityRole="link" accessibilityState={{ selected }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [ms.link, primary && ms.primary, outlined && ms.outlined, selected && ms.selected, homeCta && ms.homeCta, homeCta === 'light' && ms.homeCtaLight, homeCta === 'outline' && ms.homeCtaOutline, homeCta === 'primary' && ms.homeCtaPrimary, pressed && (homeCta === 'light' ? ms.homeCtaLightPressed : homeCta === 'primary' ? ms.homeCtaPrimaryPressed : primary || inverse ? ms.primaryPressed : ms.pressed), focused && (homeCta ? ms.homeCtaFocus : ms.focus)]}><Text style={[ms.linkText, (primary || inverse) && ms.whiteText, homeCta && ms.homeCtaText, homeCta === 'light' && ms.homeCtaDarkText, homeCta === 'primary' && ms.homeCtaPrimaryText]}>{children}</Text></Pressable></Link>;
}

export function MuseumImage({ path, alt, poster = false, hero = false }: { path: string; alt: string; poster?: boolean; hero?: boolean }) {
  const [failed, setFailed] = useState(false);
  const frame = [ms.image, poster && ms.poster, hero && ms.heroMedia];
  if (failed || !museumAssets[path]) return <View accessible accessibilityLabel={alt} style={[...frame, ms.fallback]}><Text style={[ms.small, hero && ms.whiteText]}>Không thể tải hình ảnh.</Text></View>;
  // A View owns the ratio: native Image otherwise retains the local asset's height.
  return <View style={frame}><Image source={museumAssets[path]} accessibilityLabel={alt} accessible resizeMode={hero ? 'contain' : 'cover'} onError={() => setFailed(true)} style={ms.imageContent} /></View>;
}

export function MuseumTitle({ title, description, eyebrow }: { title: string; description?: string; eyebrow?: string }) {
  return <View style={ms.section}>{eyebrow && <Text style={ms.eyebrow}>{eyebrow}</Text>}<Text accessibilityRole="header" style={ms.title}>{title}</Text>{description && <Text style={ms.body}>{description}</Text>}</View>;
}

export function MuseumFrame({ children, current }: { children: ReactNode; current?: string }) {
  return <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={ms.safe}>
    <View style={ms.header}>
      <Link href="/" asChild><Pressable accessibilityRole="link" accessibilityLabel="Bảo tàng Chứng tích Chiến tranh — Trang chủ" style={ms.brandLink}><Text style={ms.brand}>BẢO TÀNG{'\n'}<Text style={ms.brandSmall}>CHỨNG TÍCH CHIẾN TRANH</Text></Text></Pressable></Link>
    </View>
    <ScrollView style={ms.scroll} contentContainerStyle={ms.content}>
    <View style={ms.container}>{current && <View style={ms.row}><MuseumLink href="/">Trang chủ</MuseumLink><Text style={ms.small}>/ {current}</Text></View>}{children}</View>
    <View style={ms.footer}><Text style={[ms.brand, ms.whiteText]}>BẢO TÀNG{'\n'}CHỨNG TÍCH CHIẾN TRANH</Text><Text style={[ms.small, ms.whiteText]}>Ngôn ngữ giao diện: Tiếng Việt</Text>{publicNavigation.map(item => <MuseumLink key={item.href} href={item.href} inverse>{item.label}</MuseumLink>)}</View>
    </ScrollView>
    <MuseumBottomNavigation />
  </SafeAreaView>;
}
