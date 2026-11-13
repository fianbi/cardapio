import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

// Com o app aberto, a notificação do pedido também aparece.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let registered: string | null = null;

/**
 * Pede permissão e registra o aparelho no servidor para receber o andamento dos pedidos.
 * Silencioso: se o cliente negar ou der erro, o app segue funcionando (a tela do pedido atualiza sozinha).
 */
export async function registerForPush(): Promise<string | null> {
  try {
    if (Platform.OS === "web" || !Device.isDevice) return null;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("pedidos", {
        name: "Andamento dos pedidos",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token !== registered) {
      await api("/push-token", { method: "POST", body: { token, platform: Platform.OS } });
      registered = token;
    }
    return token;
  } catch {
    return null;
  }
}

/** Desliga as notificações deste aparelho para a conta (ao sair). */
export async function unregisterPush() {
  if (!registered) return;
  try {
    await api("/push-token", { method: "DELETE", body: { token: registered } });
  } catch {}
  registered = null;
}
