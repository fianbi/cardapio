import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { ORDER_STATUS_LABEL, formatPrice, isFinished } from "@cardapio/shared";
import { Badge, Button, StateView, styles } from "@/components/ui";
import type { Order } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { colors } from "@/lib/theme";
import { useFetch } from "@/lib/use-fetch";
import { useAuth } from "@/state/auth";

export default function OrdersScreen() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { data, error, loading, refreshing, refresh, reload } = useFetch<{ orders: Order[] }>(user ? "/orders" : null);

  // Atualiza a lista sempre que a aba volta a aparecer.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (ready && !user) {
    return (
      <View style={styles.screen}>
        <StateView empty="Entre com sua conta para ver e acompanhar seus pedidos." />
        <View style={{ padding: 16 }}>
          <Button title="Entrar" onPress={() => router.push("/entrar")} />
        </View>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.screen}>
        <StateView loading={loading || !ready} error={error} onRetry={refresh} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={data.orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
      ListEmptyComponent={<StateView empty="Você ainda não fez nenhum pedido." />}
      renderItem={({ item: o }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pedido ${o.number} em ${o.store.name}, ${ORDER_STATUS_LABEL[o.status]}`}
          onPress={() => router.push(`/pedido/${o.id}`)}
          style={styles.card}
        >
          <View style={styles.between}>
            <Text numberOfLines={1} style={[styles.subtitle, { flex: 1 }]}>
              {o.store.name}
            </Text>
            <Badge
              text={ORDER_STATUS_LABEL[o.status]}
              tone={o.status === "CANCELED" ? "red" : o.status === "COMPLETED" ? "neutral" : isFinished(o.status) ? "neutral" : "green"}
            />
          </View>
          <Text numberOfLines={1} style={styles.muted}>
            {o.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")}
          </Text>
          <View style={styles.between}>
            <Text style={styles.muted}>
              #{o.number} · {formatDateTime(o.createdAt)}
            </Text>
            <Text style={[styles.text, { fontWeight: "700" }]}>{formatPrice(o.totalCents)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}
