import { useColorScheme } from "react-native";

export const colors = {
  surface: "#080808",
  onSurface: "#F4F4F4",
  surfaceSecondary: "#121212",
  onSurfaceSecondary: "#F4F4F4",
  surfaceTertiary: "#181818",
  onSurfaceTertiary: "#E0E0E0",
  surfaceInverse: "#F4F4F4",
  onSurfaceInverse: "#080808",
  brand: "#D91524",
  onBrand: "#FFFFFF",
  brandPrimary: "#FF3342",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#B3121D",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "rgba(255, 51, 66, 0.12)",
  onBrandTertiary: "#FF3342",
  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",
  border: "#262626",
  borderStrong: "#404040",
  divider: "#1F1F1F",
  muted: "#A3A3A3",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const typography = {
  display: "System",
  text: "System",
  scale: { sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 },
};

export function useTheme() {
  useColorScheme();
  return { colors, spacing, radius, typography };
}
