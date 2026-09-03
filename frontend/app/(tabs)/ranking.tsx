import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { formatMoney } from "@/src/auth";

const PERIODS = [
  { key: "daily", label: "DIA" },
  { key: "weekly", label: "SEMANA" },
  { key: "monthly", label: "MÊS" },
] as const;

const METRICS = [
  { key: "earnings", label: "GANHOS" },
  { key: "revenue", label: "RECEITA" },
  { key: "washes", label: "LAVAGENS" },
] as const;

type Period = typeof PERIODS[number]["key"];
type Metric = typeof METRICS[number]["key"];

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("daily");
  const [metric, setMetric] = useState<Metric>("earnings");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.ranking(period, metric);
      setData(d);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, metric]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const formatScore = (e: any) => {
    if (metric === "washes") return `${e.washes} lav.`;
    return formatMoney(e[metric]);
  };

  const entries = data?.entries ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <View style={styles.container}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>RANKING</Text>
          <Pressable testID="open-friends-button" onPress={() => router.push("/friends")} style={styles.friendsBtn}>
            <Text style={styles.friendsBtnText}>AMIGOS</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {PERIODS.map((p) => (
            <Pressable
              key={p.key}
              testID={`period-${p.key}`}
              onPress={() => setPeriod(p.key)}
              style={[styles.chip, period === p.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, period === p.key && styles.chipTextActive]}>{p.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {METRICS.map((m) => (
            <Pressable
              key={m.key}
              testID={`metric-${m.key}`}
              onPress={() => setMetric(m.key)}
              style={[styles.chip, metric === m.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, metric === m.key && styles.chipTextActive]}>{m.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
        >
          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏁</Text>
              <Text style={styles.emptyText}>Adicione amigos para competir!</Text>
              <Pressable onPress={() => router.push("/friends/add")} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>ADICIONAR AMIGOS</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {top3.length > 0 && (
                <View style={styles.podium}>
                  {top3.map((e: any, i: number) => (
                    <LinearGradient
                      key={e.user.id}
                      colors={i === 0 ? [colors.brandPrimary, colors.brandSecondary] : [colors.surfaceSecondary, colors.surfaceSecondary]}
                      style={[styles.podiumCard, i === 0 && styles.podiumFirst, e.is_me && styles.podiumMe]}
                    >
                      <Text style={[styles.podiumRank, i === 0 && { color: "#fff" }]}>#{e.rank}</Text>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{e.user.username[0]?.toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.podiumName, i === 0 && { color: "#fff" }]} numberOfLines={1}>
                        {e.user.username}
                      </Text>
                      <Text style={[styles.podiumScore, i === 0 && { color: "#fff" }]} numberOfLines={1}>
                        {formatScore(e)}
                      </Text>
                    </LinearGradient>
                  ))}
                </View>
              )}

              {rest.map((e: any) => (
                <View
                  key={e.user.id}
                  testID={`rank-row-${e.rank}`}
                  style={[styles.row, e.is_me && styles.rowMe]}
                >
                  <Text style={[styles.rank, e.is_me && { color: colors.brandPrimary }]}>#{e.rank}</Text>
                  <View style={[styles.avatarSm]}>
                    <Text style={styles.avatarSmText}>{e.user.username[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{e.user.username} {e.is_me ? "(você)" : ""}</Text>
                    <Text style={styles.rowLevel}>NV {e.user.level}</Text>
                  </View>
                  <Text style={[styles.rowScore, e.is_me && { color: colors.brandPrimary }]}>{formatScore(e)}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  stickyHeader: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  friendsBtn: { backgroundColor: colors.brandTertiary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.onBrandTertiary },
  friendsBtnText: { color: colors.brandPrimary, fontWeight: "900", fontSize: 11, letterSpacing: 1 },
  chipsRow: { gap: 8, paddingVertical: 6, paddingHorizontal: 2 },
  chip: { paddingHorizontal: 14, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  chipTextActive: { color: colors.onBrand },
  empty: { alignItems: "center", padding: spacing.xl, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: colors.muted, fontSize: 15, marginTop: spacing.md, textAlign: "center" },
  emptyBtn: { marginTop: spacing.lg, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radius.md },
  emptyBtnText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 1 },
  podium: { flexDirection: "row", gap: 8, marginBottom: spacing.lg, alignItems: "flex-end" },
  podiumCard: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.border, minHeight: 130 },
  podiumFirst: { minHeight: 155, borderColor: colors.brandPrimary },
  podiumMe: { borderColor: colors.brandPrimary, borderWidth: 2 },
  podiumRank: { color: colors.brandPrimary, fontWeight: "900", fontSize: 14, marginBottom: 6 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceTertiary, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  avatarText: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  podiumName: { color: colors.onSurface, fontSize: 13, fontWeight: "800", maxWidth: "100%" },
  podiumScore: { color: colors.brandPrimary, fontSize: 13, fontWeight: "900", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  rowMe: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  rank: { color: colors.muted, fontWeight: "900", fontSize: 15, width: 36 },
  avatarSm: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  avatarSmText: { color: colors.onSurface, fontSize: 14, fontWeight: "900" },
  rowName: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  rowLevel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  rowScore: { color: colors.onSurface, fontSize: 14, fontWeight: "900" },
});
