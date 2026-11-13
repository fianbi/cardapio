"use client";

import { useEffect, useRef, useState } from "react";

const KEY = "cardapio:alerta-som";

/** Três bipes curtos gerados no navegador (sem arquivo de áudio). */
function beep(ctx: AudioContext) {
  [0, 0.25, 0.5].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.22);
  });
}

/**
 * Toca um alerta e mostra uma notificação do navegador quando chega pedido novo.
 * O painel recarrega os dados sozinho; este componente compara os pedidos pendentes a cada atualização.
 * Enquanto houver pedido aguardando, o som repete a cada 20 segundos.
 */
export function NewOrderAlert({ pendingIds, storeName }: { pendingIds: string[]; storeName: string }) {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === "1") setEnabled(true);
    } catch {}
  }, []);

  function play() {
    try {
      ctxRef.current ??= new AudioContext();
      void ctxRef.current.resume().then(() => beep(ctxRef.current!));
    } catch {}
  }

  // Pedido que ainda não tínhamos visto: som + notificação.
  useEffect(() => {
    const previous = seen.current;
    seen.current = new Set(pendingIds);
    if (!previous || !enabled) return; // primeira carga não alerta
    const fresh = pendingIds.filter((id) => !previous.has(id));
    if (fresh.length === 0) return;
    play();
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`Pedido novo — ${storeName}`, {
          body: fresh.length === 1 ? "Chegou um pedido novo." : `Chegaram ${fresh.length} pedidos novos.`,
          tag: "cardapio-pedido-novo",
        });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds.join(","), enabled]);

  // Repete o som enquanto houver pedido esperando resposta.
  const waiting = pendingIds.length > 0;
  useEffect(() => {
    if (!enabled || !waiting) return;
    const id = setInterval(play, 20_000);
    return () => clearInterval(id);
  }, [enabled, waiting]);

  // O título da aba mostra quantos pedidos estão esperando.
  useEffect(() => {
    const original = document.title.replace(/^\(\d+\) /, "");
    document.title = pendingIds.length > 0 ? `(${pendingIds.length}) ${original}` : original;
    return () => {
      document.title = original;
    };
  }, [pendingIds.length]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
    if (next) {
      play(); // o navegador só libera áudio depois de um clique
      if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    }
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-md px-4 py-2 text-sm print:hidden ${enabled ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}
    >
      <span>
        {enabled
          ? "Alerta sonoro ligado. Deixe esta aba aberta para ouvir os pedidos novos."
          : "Alerta sonoro desligado. Ligue para ouvir quando chegar pedido."}
      </span>
      <button type="button" onClick={toggle} className="rounded-md border border-current px-3 py-1 font-medium">
        {enabled ? "Desligar som" : "Ligar som"}
      </button>
    </div>
  );
}
