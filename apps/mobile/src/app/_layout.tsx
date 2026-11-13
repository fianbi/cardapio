import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { colors } from "@/lib/theme";
import { AuthProvider } from "@/state/auth";
import { CartProvider } from "@/state/cart";

/** Tocar na notificação abre o pedido. */
function useNotificationLinks() {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === "web") return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const orderId = response?.notification.request.content.data?.orderId;
      if (typeof orderId === "string") router.push(`/pedido/${orderId}`);
    };
    void Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);
}

export default function RootLayout() {
  useNotificationLinks();
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: colors.brandDark,
            headerTitleStyle: { color: colors.text },
            headerBackButtonDisplayMode: "minimal",
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="loja/[slug]" options={{ title: "" }} />
          <Stack.Screen name="produto" options={{ title: "", presentation: "modal" }} />
          <Stack.Screen name="carrinho" options={{ title: "Seu pedido" }} />
          <Stack.Screen name="pedido/[id]" options={{ title: "Pedido" }} />
          <Stack.Screen name="entrar" options={{ title: "Entrar", presentation: "modal" }} />
          <Stack.Screen name="enderecos" options={{ title: "Meus endereços" }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
