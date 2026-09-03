import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { colors, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";

export default function AddFriendScreen() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.searchUsers(q);
        if (!cancelled) setResults(r);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const sendReq = async (uid: string) => {
    setSending(uid);
    try {
      await api.sendFriendRequest(uid);
      setResults((prev) => prev.map((u) => (u.id === uid ? { ...u, friendship_status: "sent" } : u)));
    } catch {} finally {
      setSending(null);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        testID="search-users-input"
        value={q}
        onChangeText={setQ}
        placeholder="Buscar por nome ou email..."
        placeholderTextColor={colors.muted}
        autoFocus
        autoCapitalize="none"
        style={styles.search}
      />

      {loading && <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.md }} />}

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {q.trim().length < 2 ? (
          <Text style={styles.hint}>Digite pelo menos 2 letras para buscar</Text>
        ) : results.length === 0 && !loading ? (
          <Text style={styles.hint}>Nenhum usuário encontrado</Text>
        ) : (
          results.map((u) => {
            const status = u.friendship_status;
            let btnLabel = "Adicionar";
            let disabled = false;
            if (status === "friends") { btnLabel = "Amigos"; disabled = true; }
            else if (status === "sent") { btnLabel = "Pendente"; disabled = true; }
            else if (status === "received") { btnLabel = "Aceite via Amigos"; disabled = true; }
            return (
              <View key={u.id} style={styles.row} testID={`search-result-${u.id}`}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{u.username[0]?.toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>@{u.username}</Text>
                  <Text style={styles.meta}>{u.email} · NV {u.level}</Text>
                </View>
                <Pressable
                  testID={`add-friend-${u.id}`}
                  disabled={disabled || sending === u.id}
                  onPress={() => sendReq(u.id)}
                  style={[styles.addBtn, disabled && styles.addBtnDisabled]}
                >
                  {sending === u.id ? (
                    <ActivityIndicator color={colors.onBrand} size="small" />
                  ) : (
                    <Text style={[styles.addBtnText, disabled && { color: colors.muted }]}>{btnLabel}</Text>
                  )}
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: spacing.lg },
  search: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, color: colors.onSurface, borderWidth: 1, borderColor: colors.border, fontSize: 15 },
  hint: { color: colors.muted, textAlign: "center", padding: spacing.xl },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  avatarText: { color: colors.onSurface, fontWeight: "900" },
  name: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  addBtn: { backgroundColor: colors.brandPrimary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, minWidth: 90, alignItems: "center" },
  addBtnDisabled: { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border },
  addBtnText: { color: colors.onBrand, fontWeight: "900", fontSize: 12, letterSpacing: 0.5 },
});
