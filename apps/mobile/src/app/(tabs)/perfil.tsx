import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Card, Field, StateView, styles } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { PRIVACY_URL, TERMS_URL } from "@/lib/config";
import { colors } from "@/lib/theme";
import { useAuth } from "@/state/auth";

function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={{ paddingVertical: 10 }}>
      <Text style={{ color: colors.brandDark, fontSize: 15, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, ready, signOut, deleteAccount, updateProfile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setMessage(null);
  }, [user]);

  if (!ready) {
    return (
      <View style={styles.screen}>
        <StateView loading />
      </View>
    );
  }

  const legal = (
    <View>
      <LinkRow label="Termos de uso" onPress={() => void Linking.openURL(TERMS_URL)} />
      <LinkRow label="Política de privacidade" onPress={() => void Linking.openURL(PRIVACY_URL)} />
    </View>
  );

  if (!user) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Sua conta</Text>
        <Text style={styles.text}>Entre para fazer pedidos, acompanhar a entrega e guardar seus endereços.</Text>
        <Button title="Entrar" onPress={() => router.push("/entrar")} />
        {legal}
      </ScrollView>
    );
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({ name, ...(phone.trim() ? { phone } : {}) });
      setMessage({ text: "Dados salvos.", ok: true });
    } catch (e) {
      setMessage({ text: errorMessage(e), ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await deleteAccount();
    } catch (e) {
      setMessage({ text: errorMessage(e), ok: false });
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={styles.title}>{user.name ?? "Sua conta"}</Text>
        {user.email && <Text style={styles.muted}>{user.email}</Text>}
      </View>

      <Card>
        <Field label="Nome" value={name} onChangeText={setName} autoComplete="name" maxLength={100} />
        <Field label="Telefone com DDD" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={20} />
        {message && <Text style={message.ok ? { color: colors.green } : styles.error}>{message.text}</Text>}
        <Button title="Salvar" onPress={save} loading={saving} />
      </Card>

      <View>
        <LinkRow label="Meus endereços" onPress={() => router.push("/enderecos")} />
        {legal}
      </View>

      <Button title="Sair da conta" variant="secondary" onPress={() => void signOut()} />
      <Button
        title="Excluir minha conta"
        variant="danger"
        onPress={() =>
          confirm(
            "Excluir conta?",
            "Seus dados e endereços serão apagados e você não poderá mais ver o histórico de pedidos. Essa ação não pode ser desfeita.",
            "Excluir",
            () => void remove(),
          )
        }
      />
    </ScrollView>
  );
}
