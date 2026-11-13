import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Lojas",
          headerTitle: "Onde vamos pedir hoje?",
          tabBarIcon: ({ focused, size }) => <Ionicons name="restaurant-outline" color={focused ? colors.brand : colors.muted} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: "Pedidos",
          headerTitle: "Meus pedidos",
          tabBarIcon: ({ focused, size }) => <Ionicons name="receipt-outline" color={focused ? colors.brand : colors.muted} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ focused, size }) => <Ionicons name="person-outline" color={focused ? colors.brand : colors.muted} size={size} />,
        }}
      />
    </Tabs>
  );
}
