// Sistema de diseño minimalista y elegante: paleta neutra cálida
// con un único acento (dorado apagado), usado en toda la app.

export const colors = {
  background: '#FAFAF7',
  surface: '#FFFFFF',
  border: '#E7E4DD',
  borderFocus: '#1C1C1E',

  textPrimary: '#1C1C1E',
  textSecondary: '#8A867D',
  textOnAccent: '#FFFFFF',

  accent: '#A9835A',
  accentPressed: '#8C6A45',

  success: '#4B7C63',
  successBg: '#EEF3EF',
  danger: '#B2543D',
  dangerBg: '#F8ECE8',
  pending: '#B98B3E',
  pendingBg: '#FBF3E4'
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const typography = {
  title: { fontSize: 26, fontWeight: '600', letterSpacing: 0.2, color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSecondary
  },
  body: { fontSize: 15, color: colors.textPrimary },
  bodyMuted: { fontSize: 13, color: colors.textSecondary }
};

export const shadow = {
  card: {
    shadowColor: '#1C1C1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1
  }
};
