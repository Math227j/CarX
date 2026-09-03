import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { formatMoney } from "@/src/auth";

const FILTERS = [
  { key: "all", label: "TUDO" },
  { key: "today", label: "HOJE" },
  { key: "week", label: "SEMANA" },
  { key: "month", label: "MÊS" },
] as const;

type Filter = typeof FILTERS[number]["key"];

function dateFromKey(key: Filter): string | undefined {
  const now = new Date();
  if (key === "today") return now.toISOString().slice(0, 10);
  if (key === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  }
  if (key === "month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().slice(0, 10);
  }
  return undefined;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("all");
  const [washes, setWashes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const df = dateFromKey(filter);
      const w = await api.listWashes(df ? { date_from: df } : undefined);
      setWashes(w);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return washes;
    return washes.filter((w) => w.car_name.toLowerCase().includes(q));
  }, [washes, search]);

  const totals = useMemo(() => {
    const rev = filtered.reduce((s, w) => s + w.value, 0);
    const earn = filtered.reduce((s, w) => s + w.user_earning, 0);
    return { count: filtered.length, rev, earn };
  }, [filtered]);

  return (
    <View style={styles.container}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>HISTÓRICO</Text>
        <TextInput
          testID="history-search-input"
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar carro..."
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              testID={`history-filter-${f.key}`}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, filter === f.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
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
          <View style={styles.summary}>
            <View style={styles.sumItem}>
              <Text style={styles.sumLabel}>Lavagens</Text>
              <Text style={styles.sumValue}>{totals.count}</Text>
            </View>
            <View style={styles.sumDivider} />
            <View style={styles.sumItem}>
              <Text style={styles.sumLabel}>Receita</Text>
              <Text style={styles.sumValue}>{formatMoney(totals.rev)}</Text>
            </View>
            <View style={styles.sumDivider} />
            <View style={styles.sumItem}>
              <Text style={styles.sumLabel}>Ganhos</Text>
              <Text style={[styles.sumValue, { color: colors.brandPrimary }]}>{formatMoney(totals.earn)}</Text>
            </View>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma lavagem encontrada</Text>
            </View>
          ) : (
            filtered.map((w) => (
              <View key={w.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowCar}>{w.car_name}</Text>
                  <Text style={styles.rowDate}>
                    {new Date(w.date).toLocaleDateString("pt-BR")} · {formatMoney(w.value)} · {w.percentage}%
                  </Text>
                </View>
                <Text style={styles.rowEarn}>{formatMoney(w.user_earning)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  stickyHeader: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 2, marginBottom: spacing.md },
  search: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, fontSize: 14 },
  chipsRow: { gap: 8, paddingVertical: 10, paddingHorizontal: 2 },
  chip: { paddingHorizontal: 14, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexShrink: 0 },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  chipTextActive: { color: colors.onBrand },
  summary: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  sumItem: { flex: 1, alignItems: "center" },
  sumDivider: { width: 1, backgroundColor: colors.border },
  sumLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  sumValue: { color: colors.onSurface, fontSize: 15, fontWeight: "900", marginTop: 4 },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyText: { color: colors.muted, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  rowCar: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  rowDate: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rowEarn: { color: colors.brandPrimary, fontSize: 15, fontWeight: "900" },
});
