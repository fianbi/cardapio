// Horários de funcionamento. Todas as lojas usam o fuso de Brasília por enquanto.
export const TIMEZONE = "America/Sao_Paulo";

export type OpeningHourLike = { weekday: number; opensAt: string; closesAt: string };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Dia da semana (0 = domingo) e minutos desde 00:00 no fuso da loja. */
export function localNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** A loja está aberta agora? Considera horários que passam da meia-noite (ex.: 18:00–02:00). */
export function isOpenNow(hours: OpeningHourLike[], now = new Date()) {
  const { weekday, minutes } = localNow(now);
  const yesterday = (weekday + 6) % 7;

  return hours.some((h) => {
    const opens = toMinutes(h.opensAt);
    const closes = toMinutes(h.closesAt);
    const overnight = closes <= opens;
    if (h.weekday === weekday) {
      return overnight ? minutes >= opens : minutes >= opens && minutes < closes;
    }
    // Turno de ontem que atravessou a meia-noite
    return overnight && h.weekday === yesterday && minutes < closes;
  });
}

/** Texto curto com o horário de hoje, ex.: "Hoje: 18:00 – 23:30". */
export function todayLabel(hours: OpeningHourLike[], now = new Date()) {
  const { weekday } = localNow(now);
  const today = hours.filter((h) => h.weekday === weekday);
  if (today.length === 0) return "Fechado hoje";
  return "Hoje: " + today.map((h) => `${h.opensAt} – ${h.closesAt}`).join(", ");
}

export function weekdayName(weekday: number) {
  return WEEKDAYS[weekday];
}
