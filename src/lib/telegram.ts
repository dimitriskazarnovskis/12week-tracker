type Scheme = 'light' | 'dark';
type Haptic = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

function wa(): any { return (globalThis as any)?.Telegram?.WebApp ?? null; }

export function tg() {
  return {
    init() { const w = wa(); if (w) { try { w.ready(); w.expand(); } catch {} } },
    colorScheme(): Scheme { return (wa()?.colorScheme as Scheme) ?? 'light'; },
    onThemeChanged(cb: () => void) { try { wa()?.onEvent?.('themeChanged', cb); } catch {} },
    userId(): string | null { const id = wa()?.initDataUnsafe?.user?.id; return id != null ? String(id) : null; },
    haptic(kind: Haptic) {
      const h = wa()?.HapticFeedback; if (!h) return;
      try {
        if (kind === 'success' || kind === 'warning' || kind === 'error') h.notificationOccurred(kind);
        else h.impactOccurred(kind);
      } catch {}
    },
    safeAreaTop(): number { return Number(wa()?.safeAreaInset?.top ?? 0); },
  };
}
