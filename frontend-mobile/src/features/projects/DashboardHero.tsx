import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/common/Button';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export function DashboardHero() {
  return <View style={styles.hero}>
    <Image source={require('../../../assets/museum/images/hero.jpg')} resizeMode="cover" accessible={false} style={styles.photo} />
    <View style={styles.copy}>
      <Text style={styles.eyebrow}>CHÀO MỪNG TRỞ LẠI!</Text>
      <Text accessibilityRole="header" style={styles.title}>Khởi tạo hành trình thuyết minh đa ngôn ngữ</Text>
      <Text style={styles.description}>Tạo và quản lý nội dung thuyết minh bảo tàng trên một nền tảng.</Text>
      <Button wrapLabel onPress={() => router.push('/projects/new')}>Tạo thuyết minh</Button>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  hero: { width: '100%', minWidth: 0, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.navy },
  photo: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  copy: { padding: spacing.md, gap: spacing.sm, backgroundColor: 'rgba(17,28,50,0.88)' },
  eyebrow: { fontFamily: typography.family.semibold, fontSize: typography.size.xs, lineHeight: 20, color: colors.white },
  title: { fontFamily: typography.family.bold, fontSize: typography.size.xl, lineHeight: 34, color: colors.white },
  description: { fontFamily: typography.family.regular, fontSize: typography.size.sm, lineHeight: 22, color: colors.white },
});
