import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { useFocusEffect, Stack, useRouter } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { formatMoney } from "@/src/auth";

export default function AnalyticsScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.analytics();
      setData(d);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <>
        <Stack.Screen options={headerOpts("ANÁLISE", router)} />
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} size="large" /></View>
      </>
    );
  }

  const maxDaily = Math.max(1, ...(data?.daily_series?.map((d: any) => d.earnings) ?? [1]));

  return (
    <>
      <Stack.Screen options={headerOpts("ANÁLISE", router)} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
      >
        <Text style={styles.section}>Ganhos por dia (mês atual)</Text>
        <View style={styles.card}>
          {(!data?.daily_series || data.daily_series.length === 0) ? (
            <Text style={styles.empty}>Sem dados no mês atual</Text>
          ) : (
            data.daily_series.map((d: any) => (
              <View key={d.date} style={styles.barRow}>
                <Text style={styles.barLabel}>{d.date.slice(-2)}/{d.date.slice(5, 7)}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(d.earnings / maxDaily) * 100}%` }]} />
                </View>
                <Text style={styles.barValue}>{formatMoney(d.earnings)}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.section}>Destaques</Text>
        <View style={styles.hlRow}>
          <View style={styles.hl}>
            <Text style={styles.hlLabel}>🏆 Mais lucrativo</Text>
            <Text style={styles.hlName}>{data?.top_car?.name ?? "—"}</Text>
            <Text style={styles.hlValue}>{data?.top_car ? formatMoney(data.top_car.earnings) : ""}</Text>
          </View>
          <View style={styles.hl}>
            <Text style={styles.hlLabel}>🚗 Mais lavado</Text>
            <Text style={styles.hlName}>{data?.most_washed_car?.name ?? "—"}</Text>
            <Text style={styles.hlValue}>{data?.most_washed_car ? `${data.most_washed_car.count} lavagens` : ""}</Text>
          </View>
        </View>

        <Text style={styles.section}>Ranking de carros (mês)</Text>
        <View style={styles.card}>
          {(!data?.cars || data.cars.length === 0) ? (
            <Text style={styles.empty}>Sem lavagens no mês</Text>
          ) : (
            data.cars.map((c: any, i: number) => (
              <View key={c.name} style={styles.carRow}>
                <Text style={styles.carRank}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.carName}>{c.name}</Text>
                  <Text style={styles.carMeta}>{c.count} lavagens · {formatMoney(c.revenue)} bruto</Text>
                </View>
                <Text style={styles.carEarn}>{formatMoney(c.earnings)}</Text>
              </View>
            ))
          )}
        </View>
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
    headerLeft: () => (
      <Pressable onPress={() => router.back()} style={{ paddingRight: 12 }}>
        <Text style={{ color: colors.onSurface, fontSize: 18 }}>‹</Text>
      </Pressable>
    ),
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
  section: { color: colors.onSurface, fontSize: 14, fontWeight: "800", marginTop: spacing.md, marginBottom: spacing.sm, letterSpacing: 0.5 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  empty: { color: colors.muted, textAlign: "center", padding: spacing.md },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  barLabel: { color: colors.muted, fontSize: 11, width: 40, fontWeight: "700" },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.surfaceTertiary, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.brandPrimary },
  barValue: { color: colors.onSurface, fontSize: 11, width: 84, textAlign: "right", fontWeight: "700" },
  hlRow: { flexDirection: "row", gap: spacing.sm },
  hl: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  hlLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  hlName: { color: colors.onSurface, fontSize: 16, fontWeight: "900", marginTop: 6 },
  hlValue: { color: colors.brandPrimary, fontSize: 12, marginTop: 4, fontWeight: "700" },
  carRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: spacing.md },
  carRank: { color: colors.muted, fontWeight: "900", fontSize: 13, width: 28 },
  carName: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  carMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  carEarn: { color: colors.brandPrimary, fontSize: 14, fontWeight: "900" },
});
