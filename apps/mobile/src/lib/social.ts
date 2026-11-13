import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "./config";

/** O usuário fechou a tela de login: não é erro. */
export class LoginCanceled extends Error {}

/**
 * Abre o login do Google no aparelho e devolve o idToken, que o servidor confere.
 * O módulo nativo só existe na versão compilada do app (não no Expo Go nem no navegador).
 */
export async function googleIdToken(): Promise<string> {
  if (Platform.OS === "web") throw new Error("O login com Google funciona no aplicativo instalado.");
  let lib: typeof import("@react-native-google-signin/google-signin");
  try {
    lib = require("@react-native-google-signin/google-signin");
  } catch {
    throw new Error("O login com Google não está disponível nesta versão de teste do app.");
  }
  const { GoogleSignin, isSuccessResponse } = lib;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID || undefined });
  if (Platform.OS === "android") await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) throw new LoginCanceled();
  if (!response.data.idToken) throw new Error("O Google não devolveu a confirmação da conta. Tente novamente.");
  return response.data.idToken;
}

export async function appleSignInAvailable() {
  return Platform.OS === "ios" && (await AppleAuthentication.isAvailableAsync().catch(() => false));
}

export async function appleCredential(): Promise<{ identityToken: string; fullName: string | null }> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!credential.identityToken) throw new Error("A Apple não devolveu a confirmação da conta. Tente novamente.");
    const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ");
    return { identityToken: credential.identityToken, fullName: name || null };
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") throw new LoginCanceled();
    throw e;
  }
}
