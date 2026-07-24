type Scheme = 'light' | 'dark';
type Haptic = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

function wa(): any { return (globalThis as any)?.Telegram?.WebApp ?? null; }
function supports(feature: 'popup' | 'back' | 'closingConfirmation'): boolean {
  const w = wa(); if (!w) return false;
  const atLeast = (v: string) => typeof w.isVersionAtLeast !== 'function' || w.isVersionAtLeast(v);
  if (feature === 'popup') return typeof w.showConfirm === 'function' && atLeast('6.2');
  if (feature === 'back') return !!w.BackButton && atLeast('6.1');
  return typeof w.enableClosingConfirmation === 'function' && atLeast('6.2');
}

export function tg() {
  return {
    init() { const w = wa(); if (w) { try { w.ready(); w.expand(); } catch {} } },
    isTMA(): boolean { return !!wa()?.initData || !!wa()?.initDataUnsafe?.user; },
    colorScheme(): Scheme { return (wa()?.colorScheme as Scheme) ?? 'light'; },
    onThemeChanged(cb: () => void) { try { wa()?.onEvent?.('themeChanged', cb); } catch {} },
    userId(): string | null { const id = wa()?.initDataUnsafe?.user?.id; return id != null ? String(id) : null; },
    userFirstName(): string | null { return wa()?.initDataUnsafe?.user?.first_name || null; },
    haptic(kind: Haptic) {
      const h = wa()?.HapticFeedback; if (!h) return;
      try {
        if (kind === 'success' || kind === 'warning' || kind === 'error') h.notificationOccurred(kind);
        else h.impactOccurred(kind);
      } catch {}
    },
    safeAreaTop(): number { return Number(wa()?.safeAreaInset?.top ?? 0); },
    // Telegram BackButton (no-ops in a plain browser)
    showBack(onClick: () => void) {
      if (!supports('back')) return;
      try { const b = wa().BackButton; b.onClick(onClick); b.show(); } catch {}
    },
    hideBack(onClick?: () => void) {
      if (!supports('back')) return;
      try { const b = wa().BackButton; if (onClick) b.offClick(onClick); b.hide(); } catch {}
    },
    closingConfirmation(on: boolean) {
      if (!supports('closingConfirmation')) return;
      try { on ? wa().enableClosingConfirmation() : wa().disableClosingConfirmation(); } catch {}
    },
  };
}

// window.alert/confirm are silently suppressed inside Telegram's mobile WebViews —
// always go through these wrappers so feedback exists on every platform.
export const dialogs = {
  alert(message: string): Promise<void> {
    return new Promise(res => {
      if (supports('popup')) { try { wa().showAlert(message, () => res()); return; } catch {} }
      window.alert(message); res();
    });
  },
  confirm(message: string): Promise<boolean> {
    return new Promise(res => {
      if (supports('popup')) { try { wa().showConfirm(message, (ok: boolean) => res(!!ok)); return; } catch {} }
      res(window.confirm(message));
    });
  },
};
