import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Card, Field, StateView, styles } from "@/components/ui";
import { api, errorMessage, type Address } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useFetch } from "@/lib/use-fetch";
import { useAuth } from "@/state/auth";

const EMPTY = { label: "", street: "", number: "", district: "", complement: "", reference: "" };

export default function AddressesScreen() {
  const { user } = useAuth();
  const { data, loading, error, refresh, reload } = useFetch<{ addresses: Address[] }>(user ? "/addresses" : null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  if (!user) {
    return (
      <View style={styles.screen}>
        <StateView empty="Entre com sua conta para salvar endereços." />
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.screen}>
        <StateView loading={loading} error={error} onRetry={refresh} />
      </View>
    );
  }

  async function save() {
    setSaving(true);
    setFormError(null);
    try {
      await api("/addresses", { method: "POST", body: form });
      setForm(EMPTY);
      await reload();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/addresses/${id}`, { method: "DELETE" });
    } catch (e) {
      setFormError(errorMessage(e));
    }
    await reload();
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {data.addresses.length === 0 ? (
          <Text style={styles.muted}>Nenhum endereço salvo ainda.</Text>
        ) : (
          data.addresses.map((a) => (
            <Card key={a.id}>
              <View style={styles.between}>
                <View style={{ flex: 1 }}>
                  {a.label && <Text style={styles.subtitle}>{a.label}</Text>}
                  <Text style={styles.text}>{a.formatted}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Apagar endereço ${a.label ?? a.street}`} onPress={() => void remove(a.id)} hitSlop={10}>
                  <Text style={{ color: colors.red, fontWeight: "600" }}>Apagar</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}

        <Card>
          <Text style={styles.subtitle}>Novo endereço</Text>
          <Field label="Apelido (opcional)" value={form.label} onChangeText={set("label")} placeholder="Casa, Trabalho..." maxLength={40} />
          <Field label="Rua" value={form.street} onChangeText={set("street")} autoComplete="street-address" maxLength={200} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Número" value={form.number} onChangeText={set("number")} maxLength={20} />
            </View>
            <View style={{ flex: 2 }}>
              <Field label="Bairro" value={form.district} onChangeText={set("district")} maxLength={100} />
            </View>
          </View>
          <Field label="Complemento (opcional)" value={form.complement} onChangeText={set("complement")} placeholder="Apto, bloco, casa dos fundos" maxLength={100} />
          <Field label="Ponto de referência (opcional)" value={form.reference} onChangeText={set("reference")} maxLength={150} />
          {formError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {formError}
            </Text>
          )}
          <Button title="Salvar endereço" onPress={save} loading={saving} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
