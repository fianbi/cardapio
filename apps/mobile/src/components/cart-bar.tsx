import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatPrice } from "@cardapio/shared";
import { colors } from "@/lib/theme";
import { useCart } from "@/state/cart";

/** Barra fixa no rodapé com o resumo do carrinho. `inset` soma a área segura (telas sem barra de abas). */
export function CartBar({ inset = false }: { inset?: boolean }) {
  const router = useRouter();
  const { cart, count, subtotalCents } = useCart();
  const insets = useSafeAreaInsets();
  if (!cart || count === 0) return null;
  return (
    <View style={{ padding: 12, paddingBottom: 12 + (inset ? insets.bottom : 0), backgroundColor: "#fff", borderTopWidth: 1, borderColor: colors.border }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver carrinho, ${count} itens, ${formatPrice(subtotalCents)}`}
        onPress={() => router.push("/carrinho")}
        style={{ backgroundColor: colors.brand, borderRadius: 10, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Ver carrinho</Text>
          <Text numberOfLines={1} style={{ color: "#FFEDD5", fontSize: 12 }}>
            {cart.storeName} · {count} {count === 1 ? "item" : "itens"}
          </Text>
        </View>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{formatPrice(subtotalCents)}</Text>
      </Pressable>
    </View>
  );
}
