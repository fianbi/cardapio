import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatPrice, groupHint, optionsLabel, selectOptions, type OptionGroupLike } from "@cardapio/shared";
import { Button, Field, StateView, Stepper, styles } from "@/components/ui";
import type { StoreMenu } from "@/lib/api";
import { cachedStore, rememberStore } from "@/lib/store-cache";
import { colors } from "@/lib/theme";
import { useFetch } from "@/lib/use-fetch";
import { useCart } from "@/state/cart";

export default function ProductScreen() {
  const { slug, productId } = useLocalSearchParams<{ slug: string; productId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, add } = useCart();

  // Normalmente o cardápio já está na memória; se o app abriu direto aqui, busca de novo.
  const cached = cachedStore(slug);
  const { data, loading, error, refresh } = useFetch<{ store: StoreMenu }>(cached ? null : `/stores/${slug}`);
  const store = cached ?? data?.store ?? null;
  if (data?.store) rememberStore(data.store);
  const product = store?.categories.flatMap((c) => c.products).find((p) => p.id === productId);

  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  if (!store || !product) {
    return (
      <View style={styles.screen}>
        <StateView loading={loading} error={error ?? (store ? "Este produto não está mais no cardápio." : null)} onRetry={refresh} />
      </View>
    );
  }

  const result = selectOptions(product.optionGroups, selected);
  const unitCents = product.priceCents + (result.ok ? result.extraCents : 0);

  function toggle(group: OptionGroupLike, optionId: string) {
    setSelected((current) => {
      if (current.includes(optionId)) {
        // Grupo de escolha única obrigatória: tocar de novo não desmarca.
        return group.maxSelect === 1 && group.minSelect === 1 ? current : current.filter((id) => id !== optionId);
      }
      const inGroup = group.options.filter((o) => current.includes(o.id)).map((o) => o.id);
      if (group.maxSelect === 1) return [...current.filter((id) => !inGroup.includes(id)), optionId];
      if (inGroup.length >= group.maxSelect) return current;
      return [...current, optionId];
    });
  }

  function confirm() {
    if (!result.ok || !store || !product) return;
    const doAdd = () => {
      add(
        { slug: store.slug, name: store.name },
        {
          productId: product.id,
          name: product.name,
          unitPriceCents: unitCents,
          quantity,
          optionIds: selected,
          optionsLabel: optionsLabel(result.chosen),
          notes: notes.trim(),
        },
      );
      router.back();
    };
    // Um carrinho por loja: avisa antes de trocar.
    if (cart && cart.storeSlug !== store.slug) {
      const message = `Seu carrinho tem itens de ${cart.storeName}. Quer esvaziar e começar um pedido em ${store.name}?`;
      if (Platform.OS === "web") {
        if (window.confirm(message)) doAdd();
      } else {
        Alert.alert("Trocar de loja?", message, [
          { text: "Manter carrinho", style: "cancel" },
          { text: "Esvaziar e adicionar", style: "destructive", onPress: doAdd },
        ]);
      }
      return;
    }
    doAdd();
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {product.imageUrl && <Image source={product.imageUrl} style={{ width: "100%", height: 200, borderRadius: 12 }} contentFit="cover" />}
        <View style={{ gap: 4 }}>
          <Text style={styles.title}>{product.name}</Text>
          {product.description && <Text style={styles.text}>{product.description}</Text>}
          <Text style={[styles.subtitle, { marginTop: 4 }]}>{formatPrice(product.priceCents)}</Text>
        </View>

        {product.optionGroups.map((group) => {
          const picked = group.options.filter((o) => selected.includes(o.id)).length;
          return (
            <View key={group.id} style={{ gap: 8 }}>
              <View style={styles.between}>
                <Text style={styles.subtitle}>{group.name}</Text>
                <Text style={[styles.muted, group.minSelect > 0 && picked < group.minSelect && { color: colors.brandDark, fontWeight: "600" }]}>
                  {groupHint(group)}
                  {group.minSelect > 0 ? " · obrigatório" : ""}
                </Text>
              </View>
              <View style={[styles.card, { padding: 0, gap: 0 }]}>
                {group.options.map((o, i) => {
                  const on = selected.includes(o.id);
                  const single = group.maxSelect === 1;
                  return (
                    <Pressable
                      key={o.id}
                      accessibilityRole={single ? "radio" : "checkbox"}
                      accessibilityState={{ checked: on, disabled: !o.isAvailable }}
                      accessibilityLabel={`${o.name}${o.priceCents ? `, mais ${formatPrice(o.priceCents)}` : ""}${o.isAvailable ? "" : ", em falta"}`}
                      disabled={!o.isAvailable}
                      onPress={() => toggle(group, o.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        padding: 14,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderColor: colors.border,
                        opacity: o.isAvailable ? 1 : 0.45,
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: single ? 11 : 5,
                          borderWidth: 2,
                          borderColor: on ? colors.brand : "#A8A29E",
                          backgroundColor: on ? colors.brand : "#fff",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {on && <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>✓</Text>}
                      </View>
                      <Text style={[styles.text, { flex: 1, fontSize: 15 }]}>
                        {o.name}
                        {!o.isAvailable && " (em falta)"}
                      </Text>
                      {o.priceCents > 0 && <Text style={styles.muted}>+ {formatPrice(o.priceCents)}</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <Field label="Alguma observação?" value={notes} onChangeText={setNotes} placeholder="Ex.: sem cebola" maxLength={200} />
      </ScrollView>

      <View style={{ padding: 12, paddingBottom: 12 + insets.bottom, gap: 8, backgroundColor: "#fff", borderTopWidth: 1, borderColor: colors.border }}>
        {!result.ok && <Text style={[styles.muted, { textAlign: "center" }]}>{result.error}</Text>}
        <View style={styles.row}>
          <Stepper value={quantity} onChange={setQuantity} min={1} />
          <Button title={`Adicionar · ${formatPrice(unitCents * quantity)}`} onPress={confirm} disabled={!result.ok} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}
