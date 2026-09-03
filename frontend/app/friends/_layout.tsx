import { Stack } from "expo-router";
import { colors } from "@/src/theme";
export default function FriendsLayout() {
  return (
    <Stack screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.onSurface,
      headerTitleStyle: { fontWeight: "900", letterSpacing: 1 },
      contentStyle: { backgroundColor: colors.surface },
    }}>
      <Stack.Screen name="index" options={{ title: "AMIGOS" }} />
      <Stack.Screen name="add" options={{ title: "ADICIONAR AMIGOS", presentation: "modal" }} />
    </Stack>
  );
}
