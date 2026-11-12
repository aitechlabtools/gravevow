// Lógica pura de los mini tutoriales: qué se ha visto, la cola y los avisos «!».
import { MINI_TUTORIALS, getMini, type MiniTutorial } from './data/tutorials';

/** Se guarda en la cuenta: los mini tutoriales vistos no se repiten con cada personaje. */
export interface TutorialsSave {
  seen: string[];
  /** «Desactivar mini tutoriales» (jugadores expertos). */
  disabled: boolean;
}

export function emptyTutorials(): TutorialsSave {
  return { seen: [], disabled: false };
}

export function sanitizeTutorials(raw: unknown): TutorialsSave {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<TutorialsSave>;
  const seen = Array.isArray(r.seen) ? [...new Set(r.seen.filter((x): x is string => typeof x === 'string'))] : [];
  return { seen, disabled: !!r.disabled };
}

export function isPending(t: TutorialsSave, id: string): boolean {
  // Los avisos `always` (subidas de nivel) salen aunque estén desactivados
  return (!t.disabled || !!getMini(id)?.always) && !t.seen.includes(id);
}

/** Añade a la cola los mini tutoriales de un disparador que no se han visto ni están ya en la cola. */
export function enqueueTrigger(queue: string[], t: TutorialsSave, trigger: string): string[] {
  const add = MINI_TUTORIALS.filter((m) => m.trigger === trigger && isPending(t, m.id) && !queue.includes(m.id)).map((m) => m.id);
  return add.length ? [...queue, ...add] : queue;
}

export function markSeen(t: TutorialsSave, id: string): TutorialsSave {
  return t.seen.includes(id) ? t : { ...t, seen: [...t.seen, id] };
}

/** `data-testid` que llevan el «!» de «tienes algo nuevo que ver». */
export function pendingBadges(t: TutorialsSave): Set<string> {
  return new Set(MINI_TUTORIALS.filter((m) => m.badge && isPending(t, m.id)).map((m) => m.badge!));
}

/** ¿Puede salir ahora? Uno a la vez; nunca durante el tutorial inicial ni en un combate que no sea el suyo, ni sobre otra ventana. */
export function canShowNow(m: MiniTutorial, ctx: { combat: boolean; modal: boolean; tutorialRun: boolean }): boolean {
  if (ctx.tutorialRun || ctx.modal) return false;
  return !ctx.combat || !!m.inCombat;
}

/** Primer mini tutorial de la cola que existe (descarta los que se hayan quitado del archivo de datos). */
export function currentMini(queue: string[]): MiniTutorial | null {
  for (const id of queue) { const m = getMini(id); if (m) return m; }
  return null;
}
