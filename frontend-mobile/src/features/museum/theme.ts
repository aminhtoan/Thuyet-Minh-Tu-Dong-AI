// Public Museum roles matched to Web museum-theme.css / tokens.css, not Customer overrides.
import { StyleSheet } from 'react-native';

export const museum = {
  primary: '#5850EC', pressed: '#3730A3', accent: '#794CFF', soft: '#F0EEFF',
  navy: '#111C32', background: '#F8FAFC', section: '#F1F5F9', white: '#FFFFFF',
  text: '#0F172A', muted: '#475569', border: '#E2E8F0',
  regular: 'BeVietnamPro-Regular', semibold: 'BeVietnamPro-Semibold', bold: 'BeVietnamPro-Bold',
} as const;

export const ms = StyleSheet.create({
  safe: { flex: 1, backgroundColor: museum.background }, scroll: { flex: 1 },
  content: { flexGrow: 1 }, container: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, gap: 24 },
  header: { padding: 16, gap: 12, backgroundColor: museum.white, borderBottomWidth: 1, borderColor: museum.border },
  brand: { fontFamily: museum.bold, fontSize: 18, lineHeight: 26, color: museum.navy },
  brandSmall: { fontFamily: museum.semibold, fontSize: 12, lineHeight: 20, color: museum.primary },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  link: { minHeight: 48, minWidth: 48, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: museum.semibold, color: museum.primary, fontSize: 16, lineHeight: 24, textAlign: 'center', flexShrink: 1 },
  primary: { backgroundColor: museum.primary }, whiteText: { color: museum.white },
  pressed: { backgroundColor: museum.soft }, primaryPressed: { backgroundColor: museum.pressed }, focus: { borderColor: museum.accent },
  selected: { backgroundColor: museum.soft, borderColor: museum.primary },
  card: { padding: 16, backgroundColor: museum.white, borderRadius: 16, borderWidth: 1, borderColor: museum.border, gap: 12 },
  section: { gap: 16 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { fontFamily: museum.bold, color: museum.navy, fontSize: 28, lineHeight: 38 },
  heading: { fontFamily: museum.bold, color: museum.navy, fontSize: 22, lineHeight: 32 },
  subheading: { fontFamily: museum.semibold, color: museum.text, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: museum.regular, color: museum.muted, fontSize: 16, lineHeight: 26 },
  small: { fontFamily: museum.regular, color: museum.muted, fontSize: 14, lineHeight: 22 },
  eyebrow: { fontFamily: museum.semibold, color: museum.primary, fontSize: 12, lineHeight: 20, letterSpacing: 1 },
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: museum.section },
  poster: { aspectRatio: 16 / 9 }, fallback: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  hero: { minHeight: 380, borderRadius: 16, overflow: 'hidden', backgroundColor: museum.navy, justifyContent: 'center' },
  heroImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  heroCopy: { padding: 24, gap: 16, backgroundColor: 'rgba(17,28,50,0.78)' },
  footer: { backgroundColor: museum.navy, padding: 24, gap: 16 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, backgroundColor: museum.section, paddingHorizontal: 8, paddingVertical: 4 },
  language: { flexGrow: 1, flexBasis: 140 }, icon: { fontFamily: museum.bold, color: museum.primary, fontSize: 22, lineHeight: 32 },
});
