import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { colors, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";

export default function FriendsScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([api.listFriends(), api.friendRequests()]);
      setFriends(f);
      setRequests(r);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const accept = async (id: string) => {
    await api.acceptFriend(id);
    load();
  };
  const reject = async (id: string) => {
    await api.rejectFriend(id);
    load();
  };
  const remove = async (uid: string) => {
    await api.removeFriend(uid);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} size="large" /></View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
    >
      <Pressable testID="goto-add-friend-button" onPress={() => router.push("/friends/add")} style={styles.addBtn}>
        <Text style={styles.addBtnText}>+ ADICIONAR AMIGO</Text>
      </Pressable>

      {requests.incoming.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Solicitações recebidas ({requests.incoming.length})</Text>
          {requests.incoming.map((r: any) => (
            <View key={r.id} style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{r.user.username[0]?.toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>@{r.user.username}</Text>
                <Text style={styles.meta}>NV {r.user.level}</Text>
              </View>
              <Pressable testID={`accept-request-${r.id}`} onPress={() => accept(r.id)} style={styles.acceptBtn}>
                <Text style={styles.acceptBtnText}>Aceitar</Text>
              </Pressable>
              <Pressable testID={`reject-request-${r.id}`} onPress={() => reject(r.id)} style={styles.rejectBtn}>
                <Text style={styles.rejectBtnText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}

      {requests.outgoing.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Solicitações enviadas ({requests.outgoing.length})</Text>
          {requests.outgoing.map((r: any) => (
            <View key={r.id} style={styles.row}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{r.user.username[0]?.toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>@{r.user.username}</Text>
                <Text style={styles.meta}>Aguardando resposta...</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Amigos ({friends.length})</Text>
      {friends.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Você ainda não tem amigos. Adicione alguém!</Text>
        </View>
      ) : (
        friends.map((u) => (
          <View key={u.id} style={styles.row} testID={`friend-row-${u.id}`}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{u.username[0]?.toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>@{u.username}</Text>
              <Text style={styles.meta}>NV {u.level} · {u.total_washes} lavagens</Text>
            </View>
            <Pressable testID={`remove-friend-${u.id}`} onPress={() => remove(u.id)}>
              <Text style={styles.remove}>Remover</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
  addBtn: { backgroundColor: colors.brandPrimary, padding: 14, borderRadius: radius.md, alignItems: "center", marginBottom: spacing.lg },
  addBtnText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 1 },
  sectionTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800", marginTop: spacing.md, marginBottom: spacing.sm, letterSpacing: 0.5 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  avatarText: { color: colors.onSurface, fontWeight: "900" },
  name: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  acceptBtn: { backgroundColor: colors.brandPrimary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  acceptBtnText: { color: colors.onBrand, fontWeight: "800", fontSize: 12 },
  rejectBtn: { backgroundColor: colors.surfaceTertiary, width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  rejectBtnText: { color: colors.muted, fontSize: 14 },
  remove: { color: colors.muted, fontSize: 11 },
  empty: { padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center" },
});
