import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth, formatMoney } from "@/src/auth";

const QUICK_VALUES = [25, 35, 50, 70, 100, 150];

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { user, refresh } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [carName, setCarName] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api.dashboard();
      setData(d);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openModal = () => {
    setCarName("");
    setValue("");
    setError("");
    setModalOpen(true);
  };

  const save = async () => {
    if (!carName.trim()) return setError("Digite o nome do carro");
    const v = parseFloat(value.replace(",", "."));
    if (!v || v <= 0) return setError("Digite um valor válido");
    setError("");
    setSaving(true);
    try {
      await api.createWash({ car_name: carName, value: v });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalOpen(false);
      await Promise.all([load(), refresh()]);
    } catch (e: any) {
      setError(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteWash(id);
      await Promise.all([load(), refresh()]);
    } catch {}
  };

  const pct = user?.default_percentage ?? 40;
  const previewEarn = value ? (parseFloat(value.replace(",", ".")) * pct) / 100 : 0;
  const dailyGoal = data?.daily_goal ?? 200;
  const todayEarn = data?.today?.earnings ?? 0;
  const goalProgress = Math.min(1, todayEarn / (dailyGoal || 1));

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xxl,
          paddingHorizontal: spacing.lg,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.hi}>Olá, {user?.username}</Text>
            <Text style={styles.date}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>NV {user?.level}</Text>
          </View>
        </View>

        <LinearGradient
          colors={[colors.brand, colors.brandSecondary]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroLabel}>GANHOS HOJE</Text>
          <Text testID="today-earnings-value" style={styles.heroValue}>{formatMoney(todayEarn)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${goalProgress * 100}%` }]} />
          </View>
          <Text style={styles.heroSub}>
            Meta: {formatMoney(dailyGoal)} · {Math.round(goalProgress * 100)}%
          </Text>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Lavagens</Text>
            <Text testID="today-washes-count" style={styles.statValue}>{data?.today?.washes ?? 0}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Receita</Text>
            <Text style={styles.statValue}>{formatMoney(data?.today?.revenue ?? 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Ticket médio</Text>
            <Text style={styles.statValue}>
              {formatMoney(data?.today?.washes ? data.today.revenue / data.today.washes : 0)}
            </Text>
          </View>
        </View>

        <View style={styles.periodsRow}>
          <View style={styles.periodCard}>
            <Text style={styles.periodLabel}>SEMANA</Text>
            <Text style={styles.periodValue}>{formatMoney(data?.week?.earnings ?? 0)}</Text>
            <Text style={styles.periodSub}>{data?.week?.washes ?? 0} lavagens</Text>
          </View>
          <View style={styles.periodCard}>
            <Text style={styles.periodLabel}>MÊS</Text>
            <Text style={styles.periodValue}>{formatMoney(data?.month?.earnings ?? 0)}</Text>
            <Text style={styles.periodSub}>{data?.month?.washes ?? 0} lavagens</Text>
          </View>
        </View>

        <Pressable testID="open-add-wash-button" onPress={openModal} style={styles.addBtn}>
          <LinearGradient colors={[colors.brandPrimary, colors.brandSecondary]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.addBtnGrad}>
            <Text style={styles.addBtnText}>+ REGISTRAR LAVAGEM</Text>
          </LinearGradient>
        </Pressable>

        <Text style={styles.sectionTitle}>Lavagens de hoje</Text>
        {(!data?.todays_washes || data.todays_washes.length === 0) ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyText}>Nenhuma lavagem hoje. Bora começar?</Text>
          </View>
        ) : (
          data.todays_washes.map((w: any) => (
            <View key={w.id} style={styles.washRow} testID={`wash-row-${w.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.washCar}>{w.car_name}</Text>
                <Text style={styles.washMeta}>{formatMoney(w.value)} · {w.percentage}%</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.washEarn}>{formatMoney(w.user_earning)}</Text>
                <Pressable testID={`delete-wash-${w.id}`} onPress={() => remove(w.id)}>
                  <Text style={styles.washDel}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBg}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setModalOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg, maxHeight: "90%" }]}>
            <View style={styles.grabber} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetTitle}>Nova lavagem</Text>

            <Text style={styles.label}>Carro</Text>
            <TextInput
              testID="wash-car-input"
              value={carName}
              onChangeText={setCarName}
              placeholder="Ex: Civic"
              placeholderTextColor={colors.muted}
              style={styles.input}
              autoFocus
            />

            <Text style={styles.label}>Valor cobrado</Text>
            <TextInput
              testID="wash-value-input"
              value={value}
              onChangeText={setValue}
              placeholder="R$ 0,00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <View style={styles.quickRow}>
              {QUICK_VALUES.map((v) => (
                <Pressable key={v} onPress={() => setValue(String(v))} style={styles.chip}>
                  <Text style={styles.chipText}>R$ {v}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Seu ganho ({pct}%)</Text>
              <Text style={styles.previewValue}>{formatMoney(previewEarn)}</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable testID="save-wash-button" onPress={save} disabled={saving} style={styles.cta}>
              <LinearGradient colors={[colors.brandPrimary, colors.brandSecondary]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.ctaGrad}>
                {saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.ctaText}>SALVAR</Text>}
              </LinearGradient>
            </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  hi: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  date: { color: colors.muted, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  levelBadge: { backgroundColor: colors.brandTertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.onBrandTertiary },
  levelText: { color: colors.brandPrimary, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  heroCard: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.brandSecondary },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, letterSpacing: 2, fontWeight: "700" },
  heroValue: { color: "#fff", fontSize: 40, fontWeight: "900", marginTop: 4, letterSpacing: -1 },
  progressTrack: { height: 6, backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 3, marginTop: spacing.md, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#fff" },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: spacing.sm, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  statLabel: { color: colors.muted, fontSize: 11, letterSpacing: 0.6, fontWeight: "700" },
  statValue: { color: colors.onSurface, fontSize: 16, fontWeight: "900", marginTop: 4 },
  periodsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  periodCard: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  periodLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: "800" },
  periodValue: { color: colors.onSurface, fontSize: 20, fontWeight: "900", marginTop: 4 },
  periodSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  addBtn: { marginTop: spacing.lg, borderRadius: radius.md, overflow: "hidden" },
  addBtnGrad: { paddingVertical: 16, alignItems: "center" },
  addBtnText: { color: colors.onBrand, fontWeight: "900", fontSize: 14, letterSpacing: 1.5 },
  sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: spacing.xl, marginBottom: spacing.md },
  empty: { alignItems: "center", padding: spacing.xl, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: colors.muted, fontSize: 14 },
  washRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  washCar: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  washMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  washEarn: { color: colors.brandPrimary, fontSize: 15, fontWeight: "900" },
  washDel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  grabber: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: spacing.md },
  sheetTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "900", marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: 11, marginTop: spacing.md, marginBottom: 6, letterSpacing: 0.5, fontWeight: "700" },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, fontSize: 15 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.md },
  chip: { backgroundColor: colors.surfaceTertiary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  previewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.brandTertiary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.onBrandTertiary },
  previewLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  previewValue: { color: colors.brandPrimary, fontSize: 18, fontWeight: "900" },
  cta: { marginTop: spacing.lg, borderRadius: radius.md, overflow: "hidden" },
  ctaGrad: { paddingVertical: 16, alignItems: "center" },
  ctaText: { color: colors.onBrand, fontWeight: "900", fontSize: 14, letterSpacing: 2 },
  error: { color: colors.error, marginTop: spacing.md, fontSize: 13 },
});
