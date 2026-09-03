import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { colors, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth, formatMoney } from "@/src/auth";

const BANNER =
  "https://images.unsplash.com/photo-1605362001336-f91645086f32?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwxfHxkYXJrJTIwYWJzdHJhY3QlMjByZWQlMjByZWQlMjBuZW9uJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3ODg0NDg4MjV8MA&ixlib=rb-4.1.0&q=85";

function xpToNextLevel(level: number): number {
  // step: level 1 -> 100 xp needed, then +50 per level
  let step = 100;
  for (let i = 1; i < level; i++) step += 50;
  return step;
}

function xpProgress(user: any): { current: number; needed: number; pct: number } {
  // recompute how much xp is beyond current level threshold
  let remaining = user?.xp ?? 0;
  let step = 100;
  let lvl = 1;
  while (remaining >= step) {
    remaining -= step;
    lvl += 1;
    step += 50;
  }
  return { current: remaining, needed: step, pct: remaining / step };
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refresh, logout } = useAuth();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, f, an] = await Promise.all([api.achievements(), api.feed(), api.analytics()]);
      setAchievements(a);
      setFeed(f);
      setAnalytics(an);
      await refresh();
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refresh]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const xp = xpProgress(user);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
    >
      <View style={styles.bannerWrap}>
        <Image source={{ uri: BANNER }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient colors={["rgba(8,8,8,0.2)", "rgba(8,8,8,0.9)"]} style={StyleSheet.absoluteFillObject} />
        <View style={[styles.bannerContent, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>@{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.levelRow}>
            <Text style={styles.levelBig}>NÍVEL {user?.level}</Text>
            <Text style={styles.xp}>{xp.current} / {xp.needed} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xp.pct * 100}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Total Ganhos</Text>
            <Text style={styles.statBoxValue}>{formatMoney(user?.total_earnings ?? 0)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Total Lavagens</Text>
            <Text style={styles.statBoxValue}>{user?.total_washes ?? 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Conquistas</Text>
            <Text style={[styles.statBoxValue, { color: colors.brandPrimary }]}>{unlockedCount}/{achievements.length}</Text>
          </View>
        </View>

        <View style={styles.menu}>
          <Pressable testID="menu-friends" onPress={() => router.push("/friends")} style={styles.menuRow}>
            <Text style={styles.menuIcon}>👥</Text>
            <Text style={styles.menuText}>Amigos</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
          <Pressable testID="menu-analytics" onPress={() => router.push("/analytics")} style={styles.menuRow}>
            <Text style={styles.menuIcon}>📊</Text>
            <Text style={styles.menuText}>Análise & Carros</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
          <Pressable testID="menu-goals" onPress={() => router.push("/goals")} style={styles.menuRow}>
            <Text style={styles.menuIcon}>🎯</Text>
            <Text style={styles.menuText}>Metas</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
          <Pressable testID="menu-settings" onPress={() => router.push("/settings")} style={styles.menuRow}>
            <Text style={styles.menuIcon}>⚙️</Text>
            <Text style={styles.menuText}>Configurações</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Conquistas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: spacing.lg }}>
          {achievements.map((a) => (
            <View key={a.id} style={[styles.achievement, !a.unlocked && { opacity: 0.4 }]}>
              <View style={[styles.achIcon, a.unlocked && { backgroundColor: colors.brandTertiary, borderColor: colors.onBrandTertiary }]}>
                <Text style={{ fontSize: 22 }}>{a.unlocked ? "🏆" : "🔒"}</Text>
              </View>
              <Text style={styles.achName} numberOfLines={1}>{a.name}</Text>
              <Text style={styles.achDesc} numberOfLines={2}>{a.desc}</Text>
              <View style={styles.achBar}>
                <View style={[styles.achBarFill, { width: `${a.progress * 100}%` }]} />
              </View>
            </View>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Feed dos amigos</Text>
        {feed.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyText}>Adicione amigos para ver as conquistas deles</Text>
          </View>
        ) : (
          feed.map((f: any) => (
            <View key={f.wash.id} style={styles.feedRow}>
              <View style={styles.feedAvatar}>
                <Text style={styles.feedAvatarText}>{f.user.username[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.feedText}>
                  <Text style={{ fontWeight: "800" }}>@{f.user.username}</Text> lavou um {f.wash.car_name}
                </Text>
                <Text style={styles.feedMeta}>Ganhou {formatMoney(f.wash.user_earning)}</Text>
              </View>
            </View>
          ))
        )}

        <Pressable testID="logout-button" onPress={logout} style={styles.logout}>
          <Text style={styles.logoutText}>SAIR DA CONTA</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  bannerWrap: { height: 280, backgroundColor: colors.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: colors.border },
  bannerContent: { flex: 1, paddingHorizontal: spacing.lg, alignItems: "center", justifyContent: "flex-end", paddingBottom: spacing.lg },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brandPrimary, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: colors.surface, marginBottom: spacing.md },
  avatarText: { color: colors.onBrand, fontSize: 32, fontWeight: "900" },
  username: { color: colors.onSurface, fontSize: 20, fontWeight: "900", letterSpacing: 0.5 },
  email: { color: colors.muted, fontSize: 12, marginTop: 2 },
  levelRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: spacing.md },
  levelBig: { color: colors.brandPrimary, fontWeight: "900", fontSize: 16, letterSpacing: 1.5 },
  xp: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  xpTrack: { height: 6, width: "80%", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, marginTop: spacing.sm, overflow: "hidden" },
  xpFill: { height: "100%", backgroundColor: colors.brandPrimary },
  content: { padding: spacing.lg },
  statsGrid: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  statBox: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  statBoxLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  statBoxValue: { color: colors.onSurface, fontSize: 15, fontWeight: "900", marginTop: 6 },
  menu: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  menuRow: { flexDirection: "row", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: spacing.md },
  menuIcon: { fontSize: 20 },
  menuText: { flex: 1, color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  menuArrow: { color: colors.muted, fontSize: 22, fontWeight: "300" },
  sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginTop: spacing.xl, marginBottom: spacing.md },
  achievement: { width: 140, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  achIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceTertiary, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  achName: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  achDesc: { color: colors.muted, fontSize: 11, marginTop: 2, minHeight: 28 },
  achBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 8, overflow: "hidden" },
  achBarFill: { height: "100%", backgroundColor: colors.brandPrimary },
  emptyFeed: { padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 14 },
  feedRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  feedAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  feedAvatarText: { color: colors.onSurface, fontWeight: "900" },
  feedText: { color: colors.onSurface, fontSize: 14 },
  feedMeta: { color: colors.brandPrimary, fontSize: 12, marginTop: 2, fontWeight: "700" },
  logout: { marginTop: spacing.xl, backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  logoutText: { color: colors.error, fontWeight: "900", letterSpacing: 1.5 },
});
