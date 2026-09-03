import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth, formatMoney } from "@/src/auth";

export default function GoalsScreen() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [daily, setDaily] = useState("");
  const [weekly, setWeekly] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [dash, setDash] = useState<any>(null);

  useEffect(() => {
    setDaily(String(user?.daily_goal ?? 200));
    setWeekly(String(user?.weekly_goal ?? 1000));
    api.dashboard().then(setDash).catch(() => {});
  }, [user]);

  const save = async () => {
    setSaving(true);
    setOk(false);
    try {
      await api.updateMe({
        daily_goal: parseFloat(daily.replace(",", ".")) || 0,
        weekly_goal: parseFloat(weekly.replace(",", ".")) || 0,
      });
      await refresh();
      setOk(true);
    } catch {} finally {
      setSaving(false);
    }
  };

  const dailyProg = dash ? Math.min(1, (dash.today?.earnings ?? 0) / (parseFloat(daily) || 1)) : 0;
  const weeklyProg = dash ? Math.min(1, (dash.week?.earnings ?? 0) / (parseFloat(weekly) || 1)) : 0;

  return (
    <>
      <Stack.Screen options={headerOpts("METAS", router)} />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.card}>
          <View style={styles.progHeader}>
            <Text style={styles.progLabel}>Meta diária</Text>
            <Text style={styles.progValue}>
              {formatMoney(dash?.today?.earnings ?? 0)} / {formatMoney(parseFloat(daily) || 0)}
            </Text>
          </View>
          <View style={styles.track}><View style={[styles.fill, { width: `${dailyProg * 100}%` }]} /></View>
        </View>

        <View style={styles.card}>
          <View style={styles.progHeader}>
            <Text style={styles.progLabel}>Meta semanal</Text>
            <Text style={styles.progValue}>
              {formatMoney(dash?.week?.earnings ?? 0)} / {formatMoney(parseFloat(weekly) || 0)}
            </Text>
          </View>
          <View style={styles.track}><View style={[styles.fill, { width: `${weeklyProg * 100}%` }]} /></View>
        </View>

        <Text style={styles.section}>Configurar metas</Text>
        <Text style={styles.label}>Meta diária (R$)</Text>
        <TextInput
          testID="goal-daily-input"
          value={daily}
          onChangeText={setDaily}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <Text style={styles.label}>Meta semanal (R$)</Text>
        <TextInput
          testID="goal-weekly-input"
          value={weekly}
          onChangeText={setWeekly}
          keyboardType="decimal-pad"
          style={styles.input}
        />
        {ok && <Text style={styles.ok}>Metas salvas! ✓</Text>}
        <Pressable testID="save-goals-button" onPress={save} disabled={saving} style={styles.cta}>
          {saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.ctaText}>SALVAR</Text>}
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
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  progHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  progLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1, fontWeight: "800" },
  progValue: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  track: { height: 8, backgroundColor: colors.surfaceTertiary, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.brandPrimary },
  section: { color: colors.onSurface, fontSize: 14, fontWeight: "800", marginTop: spacing.md, marginBottom: spacing.sm, letterSpacing: 0.5 },
  label: { color: colors.muted, fontSize: 11, marginTop: spacing.md, marginBottom: 6, letterSpacing: 0.5, fontWeight: "700" },
  input: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, fontSize: 15 },
  cta: { marginTop: spacing.xl, backgroundColor: colors.brandPrimary, paddingVertical: 16, borderRadius: radius.md, alignItems: "center" },
  ctaText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 2 },
  ok: { color: colors.success, marginTop: spacing.md, textAlign: "center", fontWeight: "700" },
});
