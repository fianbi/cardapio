import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, RefreshControl, SectionList, Text, View } from "react-native";
import { formatPrice } from "@cardapio/shared";
import { CartBar } from "@/components/cart-bar";
import { Badge, StateView, styles } from "@/components/ui";
import type { StoreMenu } from "@/lib/api";
import { rememberStore } from "@/lib/store-cache";
import { colors } from "@/lib/theme";
import { useFetch } from "@/lib/use-fetch";

export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data, error, loading, refreshing, refresh } = useFetch<{ store: StoreMenu }>(`/stores/${slug}`);
  const store = data?.store;

  useEffect(() => {
    if (store) rememberStore(store);
  }, [store]);

  if (!store) {
    return (
      <View style={styles.screen}>
        <StateView loading={loading} error={error} onRetry={refresh} />
      </View>
    );
  }

  const canOrder = store.isOpen && !store.isPaused;
  const modes = [
    store.acceptsDelivery && `Entrega ${store.deliveryFeeCents ? formatPrice(store.deliveryFeeCents) : "grátis"}`,
    store.acceptsPickup && "Retirada",
    store.acceptsDineIn && "Consumo no local",
  ].filter(Boolean);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: store.name }} />
      <SectionList
        sections={store.categories.map((c) => ({ title: c.name, data: c.products }))}
        keyExtractor={(p) => p.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
        ListHeaderComponent={
          <View style={{ gap: 6, marginBottom: 8 }}>
            <View style={styles.between}>
              <Text style={[styles.title, { flex: 1 }]}>{store.name}</Text>
              <Badge text={store.isOpen ? "Aberto" : "Fechado"} tone={store.isOpen ? "green" : "red"} />
            </View>
            {store.description && <Text style={styles.text}>{store.description}</Text>}
            <Text style={styles.muted}>
              {store.todayLabel} · {modes.join(" · ")}
              {store.minOrderCents > 0 && ` · Pedido mínimo ${formatPrice(store.minOrderCents)}`}
            </Text>
            {!store.isOpen && (
              <Text style={{ backgroundColor: colors.amberSoft, color: colors.amber, padding: 10, borderRadius: 8, fontSize: 13 }}>
                A loja está fechada agora. Você pode ver o cardápio, mas os pedidos só abrem no horário de funcionamento.
              </Text>
            )}
            {store.isOpen && store.isPaused && (
              <Text style={{ backgroundColor: colors.amberSoft, color: colors.amber, padding: 10, borderRadius: 8, fontSize: 13 }}>
                A loja pausou os pedidos por alguns minutos. Tente daqui a pouco.
              </Text>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={[styles.subtitle, { marginTop: 16, marginBottom: 8 }]}>{section.title}</Text>}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item: p }) => {
          const available = p.isAvailable && canOrder;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${formatPrice(p.priceCents)}${p.isAvailable ? "" : ", em falta"}`}
              disabled={!available}
              onPress={() => router.push({ pathname: "/produto", params: { slug: store.slug, productId: p.id } })}
              style={[styles.card, { flexDirection: "row", gap: 12, opacity: p.isAvailable ? 1 : 0.5 }]}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.text, { fontWeight: "600", fontSize: 15 }]}>{p.name}</Text>
                {p.description && (
                  <Text numberOfLines={2} style={styles.muted}>
                    {p.description}
                  </Text>
                )}
                <Text style={[styles.text, { fontWeight: "700" }]}>
                  {p.optionGroups.some((g) => g.minSelect > 0 && g.options.some((o) => o.priceCents > 0)) ? "A partir de " : ""}
                  {formatPrice(p.priceCents)}
                </Text>
                {!p.isAvailable && <Text style={{ color: colors.red, fontSize: 12, fontWeight: "600" }}>Em falta</Text>}
              </View>
              {p.imageUrl && <Image source={p.imageUrl} style={{ width: 76, height: 76, borderRadius: 8 }} contentFit="cover" />}
            </Pressable>
          );
        }}
      />
      <CartBar inset />
    </View>
  );
}
