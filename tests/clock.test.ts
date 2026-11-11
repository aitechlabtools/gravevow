import { describe, expect, it } from 'vitest';
import { advanceClock, MAX_STEP_MS, newClock, PULSE_MS } from '../src/core/clock';

describe('reloj de juego', () => {
  it('la primera lectura no cuenta tiempo', () => {
    const r = advanceClock(newClock(), 5000, false);
    expect(r.clock.ms).toBe(0);
    expect(r.pulses).toBe(0);
  });
  it('cuenta pulsos con el juego activo', () => {
    let c = advanceClock(newClock(), 0, false).clock;
    let pulses = 0;
    for (let t = 250; t <= 3000; t += 250) { const r = advanceClock(c, t, false); c = r.clock; pulses += r.pulses; }
    expect(c.ms).toBe(3000);
    expect(pulses).toBe(3000 / PULSE_MS);
  });
  it('en pausa no avanza y al volver no cuenta el hueco', () => {
    let c = advanceClock(newClock(), 0, false).clock;
    c = advanceClock(c, 500, false).clock;
    c = advanceClock(c, 600, true).clock;
    expect(c.last).toBeNull();
    c = advanceClock(c, 60_000, false).clock;
    expect(c.ms).toBe(500);
    c = advanceClock(c, 60_250, false).clock;
    expect(c.ms).toBe(750);
  });
  it('un salto largo (pestaña dormida) se recorta', () => {
    let c = advanceClock(newClock(), 0, false).clock;
    c = advanceClock(c, 3_600_000, false).clock;
    expect(c.ms).toBe(MAX_STEP_MS);
  });
});
