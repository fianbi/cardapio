import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { formatPrice } from "@cardapio/shared";
import { CartBar } from "@/components/cart-bar";
import { Badge, Chip, StateView, styles } from "@/components/ui";
import type { StoreSummary } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useFetch } from "@/lib/use-fetch";

type Response = { stores: StoreSummary[]; cuisines: string[] };

export default function StoresScreen() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);

  // Espera a pessoa parar de digitar antes de buscar.
  useEffect(() => {
    const id = setTimeout(() => setQuery(text.trim()), 350);
    return () => clearTimeout(id);
  }, [text]);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (cuisine) params.set("tipo", cuisine);
  if (onlyOpen) params.set("aberto", "1");
  const { data, error, loading, refreshing, refresh } = useFetch<Response>(`/stores?${params.toString()}`);

  // Guarda os tipos de comida da primeira resposta para os filtros não sumirem durante a busca.
  const [cuisines, setCuisines] = useState<string[]>([]);
  useEffect(() => {
    if (data?.cuisines.length) setCuisines(data.cuisines);
  }, [data]);

  return (
    <View style={styles.screen}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Busque por loja ou prato (ex.: pizza, x-bacon)"
          placeholderTextColor="#A8A29E"
          accessibilityLabel="Buscar loja ou prato"
          returnKeyType="search"
          autoCorrect={false}
          style={styles.input}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Aberto agora" selected={onlyOpen} onPress={() => setOnlyOpen((v) => !v)} />
          <Chip label="Todos" selected={!cuisine} onPress={() => setCuisine("")} />
          {cuisines.map((c) => (
            <Chip key={c} label={c[0].toUpperCase() + c.slice(1)} selected={cuisine === c} onPress={() => setCuisine(cuisine === c ? "" : c)} />
          ))}
        </ScrollView>
      </View>

      {!data ? (
        <StateView loading={loading} error={error} onRetry={refresh} />
      ) : (
        <FlatList
          data={data.stores}
          keyExtractor={(s) => s.slug}
          contentContainerStyle={{ padding: 16, paddingTop: 8, gap: 12, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
          ListEmptyComponent={<StateView empty="Nenhuma loja encontrada." />}
          renderItem={({ item: s }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${s.name}, ${s.isOpen ? "aberto" : "fechado"}`}
              onPress={() => router.push(`/loja/${s.slug}`)}
              style={[styles.card, { flexDirection: "row", gap: 12, opacity: s.isOpen ? 1 : 0.65 }]}
            >
              {s.logoUrl ? (
                <Image source={s.logoUrl} style={{ width: 56, height: 56, borderRadius: 8 }} contentFit="cover" />
              ) : (
                <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 22, fontWeight: "700", color: colors.brand }}>{s.name[0]}</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.between}>
                  <Text numberOfLines={1} style={[styles.subtitle, { flex: 1 }]}>
                    {s.name}
                  </Text>
                  <Badge text={!s.isOpen ? "Fechado" : s.isPaused ? "Pausado" : "Aberto"} tone={!s.isOpen ? "red" : s.isPaused ? "amber" : "green"} />
                </View>
                {s.description && (
                  <Text numberOfLines={2} style={styles.muted}>
                    {s.description}
                  </Text>
                )}
                <Text style={styles.muted}>
                  {s.todayLabel}
                  {s.acceptsDelivery && ` · Entrega ${s.deliveryFeeCents ? formatPrice(s.deliveryFeeCents) : "grátis"}`}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
      <CartBar />
    </View>
  );
}
