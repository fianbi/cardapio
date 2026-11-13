/** 2250 -> "R$ 22,50". Feito à mão porque o Intl do React Native (Hermes) nem sempre traz pt-BR. */
export function formatPrice(cents: number) {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const centavos = (abs % 100).toString().padStart(2, "0");
  return `${negative ? "-" : ""}R$ ${reais},${centavos}`;
}

export type AddressLike = {
  street: string;
  number: string;
  district: string;
  complement?: string | null;
  reference?: string | null;
  city?: string | null;
};

/** "Rua das Flores, 120 - Centro (apto 3) · Ref.: ao lado da padaria" */
export function formatAddress(a: AddressLike) {
  let text = `${a.street}, ${a.number} - ${a.district}`;
  if (a.complement) text += ` (${a.complement})`;
  if (a.city) text += `, ${a.city}`;
  if (a.reference) text += ` · Ref.: ${a.reference}`;
  return text;
}
