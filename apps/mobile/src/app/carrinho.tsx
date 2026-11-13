import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ORDER_TYPE_LABEL,
  PAYMENT_LABEL,
  cartToOrderItems,
  formatPrice,
  type OrderType,
  type PaymentMethod,
} from "@cardapio/shared";
import { Button, Card, Chip, Field, StateView, Stepper, styles } from "@/components/ui";
import { api, errorMessage, type Address, type NewOrder, type Order, type StoreMenu } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useFetch } from "@/lib/use-fetch";
import { useAuth } from "@/state/auth";
import { useCart } from "@/state/cart";

const PAYMENTS = Object.keys(PAYMENT_LABEL) as PaymentMethod[];

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { cart, subtotalCents, setQuantity, clear } = useCart();

  // Dados atuais da loja (taxa, mínimo, se está aberta) e endereços salvos do cliente.
  const { data: storeData } = useFetch<{ store: StoreMenu }>(cart ? `/stores/${cart.storeSlug}` : null);
  const { data: addressData } = useFetch<{ addresses: Address[] }>(user ? "/addresses" : null);
  const store = storeData?.store;
  const addresses = addressData?.addresses ?? [];

  const [type, setType] = useState<OrderType | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("PIX");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [changeFor, setChangeFor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Depois do login (feito a partir desta tela), preenche nome e telefone.
  useEffect(() => {
    if (user) {
      setName((v) => v || user.name || "");
      setPhone((v) => v || user.phone || "");
    }
  }, [user]);

  // Primeiro endereço salvo já vem escolhido.
  useEffect(() => {
    if (addresses.length > 0) setAddress((v) => v || addresses[0].formatted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses.length]);

  if (!cart) {
    return (
      <View style={styles.screen}>
        <StateView empty="Seu carrinho está vazio." />
        <View style={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
          <Button title="Ver lojas" onPress={() => router.replace("/")} />
        </View>
      </View>
    );
  }

  const types = store
    ? (["DELIVERY", "PICKUP", "DINE_IN"] as OrderType[]).filter(
        (t) => (t === "DELIVERY" && store.acceptsDelivery) || (t === "PICKUP" && store.acceptsPickup) || (t === "DINE_IN" && store.acceptsDineIn),
      )
    : [];
  const chosenType = type && types.includes(type) ? type : (types[0] ?? null);
  const deliveryFee = chosenType === "DELIVERY" ? (store?.deliveryFeeCents ?? 0) : 0;
  const total = subtotalCents + deliveryFee;
  const belowMinimum = !!store && subtotalCents < store.minOrderCents;
  const closed = !!store && (!store.isOpen || store.isPaused);

  async function submit() {
    if (!cart || !chosenType) return;
    if (!user) {
      router.push("/entrar");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const body: NewOrder = {
        storeSlug: cart.storeSlug,
        type: chosenType,
        paymentMethod: payment,
        customerName: name,
        customerPhone: phone,
        deliveryAddress: chosenType === "DELIVERY" ? address : undefined,
        notes,
        changeFor: payment === "CASH" ? changeFor : undefined,
        items: cartToOrderItems(cart),
      };
      const { order } = await api<{ order: Order }>("/orders", { method: "POST", body });
      clear();
      router.replace({ pathname: "/pedido/[id]", params: { id: order.id, novo: "1" } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{cart.storeName}</Text>

        <Card style={{ padding: 0, gap: 0 }}>
          {cart.items.map((item, i) => (
            <View key={item.key} style={{ padding: 14, gap: 6, borderTopWidth: i === 0 ? 0 : 1, borderColor: colors.border }}>
              <View style={styles.between}>
                <Text style={[styles.text, { flex: 1, fontWeight: "600", fontSize: 15 }]}>{item.name}</Text>
                <Text style={[styles.text, { fontWeight: "700" }]}>{formatPrice(item.unitPriceCents * item.quantity)}</Text>
              </View>
              {!!item.optionsLabel && <Text style={styles.muted}>{item.optionsLabel}</Text>}
              {!!item.notes && <Text style={styles.muted}>Obs.: {item.notes}</Text>}
              <View style={styles.between}>
                <Text style={styles.muted}>{formatPrice(item.unitPriceCents)} cada</Text>
                <Stepper value={item.quantity} onChange={(q) => setQuantity(item.key, q)} />
              </View>
            </View>
          ))}
        </Card>
        <Pressable accessibilityRole="button" onPress={() => router.push(`/loja/${cart.storeSlug}`)}>
          <Text style={{ color: colors.brandDark, fontWeight: "600", textAlign: "center" }}>+ Adicionar mais itens</Text>
        </Pressable>

        <View style={{ gap: 8 }}>
          <Text style={styles.subtitle}>Como você quer receber?</Text>
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            {types.map((t) => (
              <Chip
                key={t}
                selected={chosenType === t}
                onPress={() => setType(t)}
                label={t === "DELIVERY" ? `Entrega (${store?.deliveryFeeCents ? formatPrice(store.deliveryFeeCents) : "grátis"})` : ORDER_TYPE_LABEL[t]}
              />
            ))}
          </View>
          {chosenType === "DELIVERY" && (
            <View style={{ gap: 8 }}>
              {addresses.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {addresses.map((a) => (
                    <Chip key={a.id} label={a.label || `${a.street}, ${a.number}`} selected={address === a.formatted} onPress={() => setAddress(a.formatted)} />
                  ))}
                </ScrollView>
              )}
              <Field
                label="Endereço de entrega"
                value={address}
                onChangeText={setAddress}
                placeholder="Rua, número, bairro, complemento"
                multiline
                maxLength={300}
              />
              {user && (
                <Pressable accessibilityRole="button" onPress={() => router.push("/enderecos")}>
                  <Text style={{ color: colors.brandDark, fontWeight: "600" }}>Salvar ou gerenciar endereços</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.subtitle}>Seus dados</Text>
          <Field label="Nome" value={name} onChangeText={setName} autoComplete="name" maxLength={100} />
          <Field label="Telefone com DDD" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="(11) 91234-5678" maxLength={20} />
          <Field label="Observações para a loja" value={notes} onChangeText={setNotes} maxLength={500} />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.subtitle}>Pagamento</Text>
          <Text style={styles.muted}>O pagamento é feito diretamente com a loja, na entrega ou retirada.</Text>
          <View style={[styles.row, { flexWrap: "wrap" }]}>
            {PAYMENTS.map((p) => (
              <Chip key={p} label={PAYMENT_LABEL[p]} selected={payment === p} onPress={() => setPayment(p)} />
            ))}
          </View>
          {payment === "CASH" && (
            <Field label="Troco para quanto? (deixe vazio se não precisar)" value={changeFor} onChangeText={setChangeFor} keyboardType="decimal-pad" placeholder="Ex.: 50,00" />
          )}
        </View>

        <Card>
          <View style={styles.between}>
            <Text style={styles.text}>Subtotal</Text>
            <Text style={styles.text}>{formatPrice(subtotalCents)}</Text>
          </View>
          {chosenType === "DELIVERY" && (
            <View style={styles.between}>
              <Text style={styles.text}>Taxa de entrega</Text>
              <Text style={styles.text}>{deliveryFee ? formatPrice(deliveryFee) : "Grátis"}</Text>
            </View>
          )}
          <View style={styles.between}>
            <Text style={styles.subtitle}>Total</Text>
            <Text style={styles.subtitle}>{formatPrice(total)}</Text>
          </View>
        </Card>
      </ScrollView>

      <View style={{ padding: 12, paddingBottom: 12 + insets.bottom, gap: 8, backgroundColor: "#fff", borderTopWidth: 1, borderColor: colors.border }}>
        {belowMinimum && <Text style={{ color: colors.amber, fontSize: 13 }}>O pedido mínimo desta loja é {formatPrice(store!.minOrderCents)}.</Text>}
        {closed && <Text style={styles.error}>{store!.isOpen ? "A loja pausou os pedidos por alguns minutos." : "A loja está fechada no momento."}</Text>}
        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        <Button
          title={user ? `Fazer pedido · ${formatPrice(total)}` : "Entrar para fazer o pedido"}
          onPress={submit}
          loading={sending}
          disabled={!store || !chosenType || belowMinimum || closed}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
