import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

export const Colors = {
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',
  primaryBg: '#F5F3FF',

  accent: '#F43F5E',
  accentLight: '#FCA5A5',
  accentBg: '#FFF1F2',

  gold: '#F59E0B',
  goldLight: '#FDE68A',
  goldBg: '#FFFBEB',

  success: '#10B981',
  successLight: '#6EE7B7',
  successBg: '#ECFDF5',

  info: '#3B82F6',
  infoLight: '#93C5FD',
  infoBg: '#EFF6FF',

  warning: '#F59E0B',
  warningBg: '#FFFBEB',

  danger: '#EF4444',
  dangerLight: '#FCA5A5',
  dangerBg: '#FEF2F2',

  text: '#1E1B4B',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgMuted: '#F1F5F9',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  gradient: {
    primary: ['#7C3AED', '#A78BFA'] as [string, string],
    warm: ['#F43F5E', '#FB923C'] as [string, string],
    cool: ['#3B82F6', '#8B5CF6'] as [string, string],
    success: ['#10B981', '#34D399'] as [string, string],
    gold: ['#F59E0B', '#FBBF24'] as [string, string],
    dark: ['#1E1B4B', '#4C1D95'] as [string, string],
    card: ['#FFFFFF', '#F8FAFC'] as [string, string],
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  display: 28,
  hero: 36,
};

export const Shadow = {
  sm: {
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  }),
};

export const Typography = StyleSheet.create({
  hero: { fontSize: FontSize.hero, fontWeight: '800' as const, color: Colors.text, letterSpacing: -1 },
  display: { fontSize: FontSize.display, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.5 },
  h1: { fontSize: FontSize.xxl, fontWeight: '700' as const, color: Colors.text },
  h2: { fontSize: FontSize.xl, fontWeight: '700' as const, color: Colors.text },
  h3: { fontSize: FontSize.lg, fontWeight: '600' as const, color: Colors.text },
  body: { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  bodyBold: { fontSize: FontSize.md, fontWeight: '600' as const, color: Colors.text },
  caption: { fontSize: FontSize.sm, color: Colors.textTertiary },
  captionBold: { fontSize: FontSize.sm, fontWeight: '600' as const, color: Colors.textSecondary },
  tiny: { fontSize: FontSize.xs, color: Colors.textTertiary },
});

export const Layout = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.md,
  },
  cardFlat: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
});

export const SCREEN_W_VAL = SCREEN_W;
