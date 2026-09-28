export interface AlertSettings {
  sound: boolean;
  vibration: boolean;
}

export interface Alerts {
  /** Chamar dentro de um toque do usuário: navegadores só liberam áudio após um gesto. */
  prime(): void;
  /** Fim do descanso: 3 bipes + vibração (conforme ajustes); notificação só se o app estiver oculto. */
  finished(): Promise<void>;
}

/** Notificação é reforço: pedir permissão só após uma ação do usuário (ex.: iniciar treino). */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function createAlerts(getSettings: () => Promise<AlertSettings>): Alerts {
  let ctx: AudioContext | null = null;

  function audio(): AudioContext | null {
    if (ctx) return ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  }

  function beeps(count: number) {
    const c = audio();
    if (!c) return;
    void c.resume();
    const t0 = c.currentTime;
    for (let i = 0; i < count; i++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.4, t0 + i * 0.3 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.3 + 0.2);
      osc.connect(gain).connect(c.destination);
      osc.start(t0 + i * 0.3);
      osc.stop(t0 + i * 0.3 + 0.22);
    }
  }

  async function notify() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted')
      return;
    if (!document.hidden) return;
    const opts = {
      body: 'Hora da próxima série.',
      tag: 'descanso',
      requireInteraction: false,
    };
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.showNotification('Descanso terminou', opts);
      else new Notification('Descanso terminou', opts);
    } catch {
      /* sem notificação: som e vibração já cobrem o primeiro plano */
    }
  }

  return {
    prime() {
      const c = audio();
      if (c && c.state === 'suspended') void c.resume();
    },
    async finished() {
      let s: AlertSettings = { sound: true, vibration: true };
      try {
        s = await getSettings();
      } catch {
        /* usa o padrão: melhor apitar do que ficar mudo */
      }
      if (s.sound) beeps(3);
      if (s.vibration) navigator.vibrate?.([200, 100, 200, 100, 200]);
      await notify();
    },
  };
}
