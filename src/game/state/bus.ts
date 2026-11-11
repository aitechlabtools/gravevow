// Bus de eventos mínimo entre la interfaz (React) y el motor (Phaser).
type Handler = (payload: never) => void;

export interface BusEvents {
  'combat-ended': { entityId: string | null; entityIds: string[]; killed: string[]; outcome: 'victory' | 'defeat' | 'fled'; kind: string };
  'rival-changed': undefined;
  /** El errante traidor da su aviso: su triángulo tiembla. */
  'rival-warn': undefined;
  /** Tutorial: el jugador cae y vuelve al último punto seguro. */
  'tutorial-revive': { x: number; y: number };
  'merc-changed': undefined;
  'bags-changed': undefined;
  'cancel-channel': undefined;
}

const handlers = new Map<string, Set<Handler>>();

export const bus = {
  on<K extends keyof BusEvents>(ev: K, fn: (p: BusEvents[K]) => void) {
    if (!handlers.has(ev)) handlers.set(ev, new Set());
    handlers.get(ev)!.add(fn as Handler);
    return () => handlers.get(ev)!.delete(fn as Handler);
  },
  emit<K extends keyof BusEvents>(ev: K, p?: BusEvents[K]) {
    handlers.get(ev)?.forEach((fn) => (fn as (x: BusEvents[K] | undefined) => void)(p));
  },
  clear() {
    handlers.clear();
  },
};
