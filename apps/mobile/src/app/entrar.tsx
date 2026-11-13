import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Platform, ScrollView, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Button, Field, styles } from "@/components/ui";
import { errorMessage, ApiError } from "@/lib/api";
import { DEV_LOGIN, PRIVACY_URL, TERMS_URL } from "@/lib/config";
import { LoginCanceled, appleSignInAvailable } from "@/lib/social";
import { colors } from "@/lib/theme";
import { useAuth } from "@/state/auth";

export default function SignInScreen() {
  const router = useRouter();
  const { user, signInWithGoogle, signInWithApple, signInDev } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apple, setApple] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    void appleSignInAvailable().then(setApple);
  }, []);

  // Entrou: fecha a tela e volta para onde estava (carrinho, pedidos...).
  useEffect(() => {
    if (user) router.back();
  }, [user, router]);

  async function run(kind: string, action: () => Promise<void>) {
    setError(null);
    setBusy(kind);
    try {
      await action();
    } catch (e) {
      if (!(e instanceof LoginCanceled)) setError(e instanceof ApiError ? errorMessage(e) : (e as Error).message || "Não foi possível entrar. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: 32 }]} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 6 }}>
        <Text style={styles.title}>Entre para pedir</Text>
        <Text style={styles.text}>Use sua conta para fazer e acompanhar seus pedidos. Não precisa criar senha.</Text>
      </View>

      {Platform.OS !== "web" && (
        <Button title="Continuar com Google" variant="secondary" loading={busy === "google"} disabled={!!busy} onPress={() => run("google", signInWithGoogle)} />
      )}
      {apple && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={10}
          style={{ height: 48 }}
          onPress={() => void run("apple", signInWithApple)}
        />
      )}

      {DEV_LOGIN && (
        <View style={[styles.card, { borderStyle: "dashed" }]}>
          <Text style={styles.muted}>Login de teste (só em desenvolvimento)</Text>
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="voce@teste.com" />
          <Button title="Entrar com e-mail de teste" loading={busy === "dev"} disabled={!!busy || !email.trim()} onPress={() => run("dev", () => signInDev(email.trim()))} />
        </View>
      )}

      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}

      <Text style={[styles.muted, { textAlign: "center" }]}>
        Ao continuar, você concorda com os{" "}
        <Text style={{ color: colors.brandDark }} onPress={() => void Linking.openURL(TERMS_URL)}>
          Termos de uso
        </Text>{" "}
        e a{" "}
        <Text style={{ color: colors.brandDark }} onPress={() => void Linking.openURL(PRIVACY_URL)}>
          Política de privacidade
        </Text>
        .
      </Text>
    </ScrollView>
  );
}
