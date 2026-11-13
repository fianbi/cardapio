import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// O token da sessão fica no cofre do aparelho (Keychain/Keystore). No navegador (só desenvolvimento) usa o AsyncStorage.
const TOKEN_KEY = "cardapio.token";

export async function loadToken() {
  try {
    return Platform.OS === "web" ? await AsyncStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string | null) {
  try {
    if (Platform.OS === "web") {
      if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
      else await AsyncStorage.removeItem(TOKEN_KEY);
    } else if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // sem armazenamento: a sessão vale só enquanto o app estiver aberto
  }
}

export async function loadJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveJson(key: string, value: unknown) {
  try {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
