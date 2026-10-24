import { StyleSheet } from 'react-native';
import { spacing, typography } from '@/theme/tokens';

export const authFormStyles = StyleSheet.create({
  form: { gap: spacing.md },
  feedback: { fontFamily: typography.family.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.normal },
});
