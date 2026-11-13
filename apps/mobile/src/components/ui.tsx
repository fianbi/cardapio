import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors } from "@/lib/theme";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={!!off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        off && { opacity: 0.5 },
        pressed && !off && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.brand} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" && { color: colors.text },
            variant === "danger" && { color: colors.red },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor="#A8A29E" {...props} style={[styles.input, props.style]} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ text, tone }: { text: string; tone: "green" | "red" | "amber" | "neutral" }) {
  const map = {
    green: [colors.greenSoft, colors.green],
    red: [colors.redSoft, colors.red],
    amber: [colors.amberSoft, colors.amber],
    neutral: ["#F5F5F4", colors.muted],
  } as const;
  return (
    <View style={[styles.badge, { backgroundColor: map[tone][0] }]}>
      <Text style={{ color: map[tone][1], fontSize: 12, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

/** Opção de escolha única em linha (forma de entrega, pagamento, filtros). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.brand, borderColor: colors.brand }]}
    >
      <Text style={{ color: selected ? "#fff" : colors.text, fontSize: 14, fontWeight: selected ? "600" : "400" }}>{label}</Text>
    </Pressable>
  );
}

/** Carregando / erro com "tentar de novo" / vazio. */
export function StateView({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.state}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.brand} />
      ) : error ? (
        <>
          <Text style={styles.stateText}>{error}</Text>
          {onRetry && <Button title="Tentar de novo" variant="secondary" onPress={onRetry} />}
        </>
      ) : (
        <Text style={styles.stateText}>{empty}</Text>
      )}
    </View>
  );
}

export function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityLabel="Diminuir" onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepperButton}>
        <Text style={styles.stepperSign}>−</Text>
      </Pressable>
      <Text style={{ minWidth: 24, textAlign: "center", fontWeight: "600", color: colors.text }}>{value}</Text>
      <Pressable accessibilityLabel="Aumentar" onPress={() => onChange(value + 1)} style={styles.stepperButton}>
        <Text style={styles.stepperSign}>+</Text>
      </Pressable>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  text: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  label: { fontSize: 13, color: colors.muted },
  error: { color: colors.red, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonSecondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#FCA5A5" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  stateText: { color: colors.muted, textAlign: "center", fontSize: 15 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: "#fff" },
  stepperButton: { paddingHorizontal: 14, paddingVertical: 8 },
  stepperSign: { fontSize: 18, color: colors.brandDark, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
});
