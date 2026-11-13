import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, PAYMENT_LABEL, formatPrice, isFinished } from "@cardapio/shared";
import { Button, Card, StateView, styles } from "@/components/ui";
import type { Order } from "@/lib/api";
import { formatDateTime, formatTime } from "@/lib/dates";
import { colors } from "@/lib/theme";
import { useFetch } from "@/lib/use-fetch";

export default function OrderScreen() {
  const { id, novo } = useLocalSearchParams<{ id: string; novo?: string }>();
  const router = useRouter();
  // Atualiza sozinho a cada 10 segundos (além das notificações).
  const { data, error, loading, refreshing, refresh } = useFetch<{ order: Order }>(`/orders/${id}`, { pollMs: 10_000 });
  const order = data?.order;

  if (!order) {
    return (
      <View style={styles.screen}>
        <StateView loading={loading} error={error} onRetry={refresh} />
      </View>
    );
  }

  const current = order.steps.indexOf(order.status);
  const finished = isFinished(order.status);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
    >
      <Stack.Screen options={{ title: `Pedido #${order.number}` }} />

      {novo === "1" && order.status === "PENDING" && (
        <Text style={{ backgroundColor: colors.greenSoft, color: colors.green, padding: 12, borderRadius: 8 }}>
          Pedido enviado! A loja vai confirmar em instantes. Você recebe um aviso a cada etapa.
        </Text>
      )}

      <View style={{ gap: 2 }}>
        <Text style={styles.muted}>{order.store.name}</Text>
        <Text style={styles.title}>Pedido #{order.number}</Text>
        <Text style={styles.muted}>
          {formatDateTime(order.createdAt)} · {ORDER_TYPE_LABEL[order.type]}
        </Text>
      </View>

      <Card>
        {order.status === "CANCELED" ? (
          <>
            <Text style={{ color: colors.red, fontWeight: "700", fontSize: 16 }}>Pedido cancelado</Text>
            {order.cancelReason && <Text style={styles.text}>Motivo: {order.cancelReason}</Text>}
          </>
        ) : (
          <>
            {order.steps.map((step, i) => (
              <View key={step} style={styles.row} accessibilityLabel={`${ORDER_STATUS_LABEL[step]}${i === current ? ", etapa atual" : i < current ? ", concluída" : ""}`}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: i < current ? colors.green : i === current ? colors.brand : "#D6D3D1",
                  }}
                />
                <Text style={{ fontSize: 15, color: i <= current ? colors.text : "#A8A29E", fontWeight: i === current ? "700" : "400" }}>
                  {ORDER_STATUS_LABEL[step]}
                </Text>
              </View>
            ))}
            {order.estimatedReadyAt && !finished && (
              <Text style={[styles.text, { marginTop: 4 }]}>
                Previsão: <Text style={{ fontWeight: "700" }}>{formatTime(order.estimatedReadyAt)}</Text> ({order.estimatedMinutes} min)
              </Text>
            )}
          </>
        )}
      </Card>

      <Card style={{ padding: 0, gap: 0 }}>
        {order.items.map((item, i) => (
          <View key={item.id} style={{ padding: 14, gap: 2, borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.border }}>
            <View style={styles.between}>
              <Text style={[styles.text, { flex: 1 }]}>
                {item.quantity}x {item.productName}
              </Text>
              <Text style={styles.text}>{formatPrice(item.unitPriceCents * item.quantity)}</Text>
            </View>
            {item.options.length > 0 && <Text style={styles.muted}>{item.options.map((o) => o.optionName).join(", ")}</Text>}
            {item.notes && <Text style={styles.muted}>Obs.: {item.notes}</Text>}
          </View>
        ))}
        <View style={{ padding: 14, gap: 4, borderTopWidth: 1, borderColor: colors.border }}>
          <View style={styles.between}>
            <Text style={styles.text}>Subtotal</Text>
            <Text style={styles.text}>{formatPrice(order.subtotalCents)}</Text>
          </View>
          {order.type === "DELIVERY" && (
            <View style={styles.between}>
              <Text style={styles.text}>Taxa de entrega</Text>
              <Text style={styles.text}>{order.deliveryFeeCents ? formatPrice(order.deliveryFeeCents) : "Grátis"}</Text>
            </View>
          )}
          <View style={styles.between}>
            <Text style={styles.subtitle}>Total</Text>
            <Text style={styles.subtitle}>{formatPrice(order.totalCents)}</Text>
          </View>
          <Text style={[styles.muted, { marginTop: 6 }]}>
            Pagamento: {order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : "na comanda"}
            {order.changeForCents ? ` · troco para ${formatPrice(order.changeForCents)}` : ""}
          </Text>
          {order.deliveryAddress && <Text style={styles.muted}>Entrega em: {order.deliveryAddress}</Text>}
          {order.notes && <Text style={styles.muted}>Observações: {order.notes}</Text>}
        </View>
      </Card>

      {order.store.phone && !finished && (
        <Button title={`Ligar para a loja (${order.store.phone})`} variant="secondary" onPress={() => void Linking.openURL(`tel:${order.store.phone}`)} />
      )}
      {finished && <Button title="Pedir de novo nesta loja" variant="secondary" onPress={() => router.push(`/loja/${order.store.slug}`)} />}
    </ScrollView>
  );
}
