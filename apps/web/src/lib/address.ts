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
