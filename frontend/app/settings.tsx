import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, refresh, logout } = useAuth();
  const [pct, setPct] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => { setPct(String(user?.default_percentage ?? 40)); }, [user]);

  const save = async () => {
    setSaving(true);
    setOk(false);
    try {
      await api.updateMe({ default_percentage: parseFloat(pct.replace(",", ".")) || 0 });
      await refresh();
      setOk(true);
    } catch {} finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={headerOpts("CONFIGURAÇÕES", router)} />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Text style={styles.section}>Cálculo de ganhos</Text>
        <Text style={styles.label}>Porcentagem padrão do lavador (%)</Text>
        <TextInput
          testID="settings-percentage-input"
          value={pct}
          onChangeText={setPct}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <Text style={styles.help}>Esta é a % que você recebe de cada lavagem</Text>

        {ok && <Text style={styles.ok}>Salvo! ✓</Text>}

        <Pressable testID="save-settings-button" onPress={save} disabled={saving} style={styles.cta}>
          {saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.ctaText}>SALVAR</Text>}
        </Pressable>

        <Text style={styles.section}>Conta</Text>
        <View style={styles.info}>
          <Text style={styles.infoLabel}>Usuário</Text>
          <Text style={styles.infoValue}>@{user?.username}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>

        <Pressable testID="settings-logout-button" onPress={logout} style={styles.logout}>
          <Text style={styles.logoutText}>SAIR DA CONTA</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function headerOpts(title: string, router: any) {
  return {
    headerShown: true,
    title,
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.onSurface,
    headerTitleStyle: { fontWeight: "900" as const, letterSpacing: 1 },
    headerLeft: () => (<Pressable onPress={() => router.back()} style={{ paddingRight: 12 }}><Text style={{ color: colors.onSurface, fontSize: 18 }}>‹</Text></Pressable>),
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  section: { color: colors.onSurface, fontSize: 14, fontWeight: "800", marginTop: spacing.md, marginBottom: spacing.sm, letterSpacing: 0.5 },
  label: { color: colors.muted, fontSize: 11, marginBottom: 6, letterSpacing: 0.5, fontWeight: "700" },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, fontSize: 15 },
  help: { color: colors.muted, fontSize: 11, marginTop: 6 },
  cta: { marginTop: spacing.lg, backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: radius.md, alignItems: "center" },
  ctaText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 2 },
  ok: { color: colors.success, marginTop: spacing.md, textAlign: "center", fontWeight: "700" },
  info: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  infoLabel: { color: colors.muted, fontSize: 13 },
  infoValue: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  logout: { marginTop: spacing.xl, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, alignItems: "center", borderWidth: 1, borderColor: colors.error },
  logoutText: { color: colors.error, fontWeight: "900", letterSpacing: 1.5 },
});
