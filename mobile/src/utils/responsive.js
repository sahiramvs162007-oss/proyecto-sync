import { useWindowDimensions } from 'react-native';

// Breakpoints simples, suficientes para decidir columnas y anchos máximos
const BREAKPOINTS = { phone: 480, tablet: 900 };

export function useResponsive() {
  const { width } = useWindowDimensions();

  const isPhone = width < BREAKPOINTS.phone;
  const isTablet = width >= BREAKPOINTS.phone && width < BREAKPOINTS.tablet;
  const isDesktop = width >= BREAKPOINTS.tablet;

  return {
    width,
    isPhone,
    isTablet,
    isDesktop,
    // cuántas columnas usar en listados tipo grilla
    columns: isDesktop ? 3 : isTablet ? 2 : 1,
    // ancho máximo de contenido para que no se estire infinito en pantallas grandes
    contentMaxWidth: isDesktop ? 720 : isTablet ? 600 : '100%'
  };
}
