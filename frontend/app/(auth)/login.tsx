import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth";

const BG =
  "https://images.unsplash.com/photo-1580014317999-e9f1936787a5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjYXIlMjBkYXJrJTIwbGlnaHRpbmd8ZW58MHx8fHwxNzg4NDQ4ODI1fDA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email || !password) {
      setError("Preencha email e senha");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: any) {
      setError(e.message || "Falha no login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: BG }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient
        colors={["rgba(8,8,8,0.35)", "rgba(8,8,8,0.85)", "#080808"]}
        style={StyleSheet.absoluteFillObject}
        locations={[0, 0.55, 1]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>FX</Text>
            </View>
            <Text style={styles.title}>FLASH CARX</Text>
            <Text style={styles.tagline}>Acelere seus ganhos</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entrar</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              testID="login-password-input"
              value={password}
              onChangeText={setPassword}
              placeholder="******"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
            />

            {error ? (
              <Text testID="login-error-text" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Pressable testID="login-submit-button" onPress={submit} disabled={loading} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
              <LinearGradient
                colors={[colors.brandPrimary, colors.brandSecondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGrad}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onBrand} />
                ) : (
                  <Text style={styles.ctaText}>ENTRAR</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Link href="/(auth)/register" asChild>
              <Pressable testID="login-goto-register-button" style={styles.altBtn}>
                <Text style={styles.altText}>
                  Não tem conta? <Text style={{ color: colors.brandPrimary }}>Criar conta</Text>
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, justifyContent: "center" },
  brand: { alignItems: "center", marginBottom: spacing.xl },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  logoBadgeText: { color: colors.onBrand, fontSize: 26, fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 32, fontWeight: "900", color: colors.onSurface, letterSpacing: 3 },
  tagline: { color: colors.muted, marginTop: spacing.xs, fontSize: 13 },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800", marginBottom: spacing.lg },
  label: { color: colors.muted, fontSize: 12, marginBottom: spacing.xs, marginTop: spacing.md, fontWeight: "600", letterSpacing: 0.6 },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
  },
  cta: { marginTop: spacing.xl, borderRadius: radius.md, overflow: "hidden" },
  ctaGrad: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  ctaText: { color: colors.onBrand, fontWeight: "900", fontSize: 15, letterSpacing: 2 },
  altBtn: { marginTop: spacing.lg, alignItems: "center" },
  altText: { color: colors.onSurfaceTertiary, fontSize: 14 },
  error: { color: colors.error, marginTop: spacing.md, fontSize: 13 },
});
