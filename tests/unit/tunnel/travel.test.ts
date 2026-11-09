import { describe, expect, it } from 'vitest';
import * as travel from '../../../src/lib/features/tunnel/view/travel';

function harness() {
  let now = 100;
  let nextId = 0;
  const pending = new Map<number, (now: number) => void>();
  const positions: number[] = [];
  const controller = travel.createTravelController({
    now: () => now,
    requestFrame: (callback) => { pending.set(++nextId, callback); return nextId; },
    cancelFrame: (id) => { pending.delete(id); }
  }, (position) => { positions.push(position); });
  return {
    controller, positions, pending,
    frame(elapsed: number) {
      now += elapsed;
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(now));
    }
  };
}

describe('travel animation', () => {
  it('cancels on user interruption or teardown, even if an old frame fires', () => {
    const h = harness();
    h.controller.travelTo(0, 2000);
    h.frame(225);
    const staleFrame = [...h.pending.values()][0];
    h.controller.cancel();
    expect(h.controller.isTravelling).toBe(false);
    expect(h.pending.size).toBe(0);
    staleFrame(10000);
    h.frame(5000);
    expect(h.positions).toEqual([250]);
  });

  it('replaces an ongoing journey instead of running two animations', () => {
    const h = harness();
    h.controller.travelTo(0, 2000);
    h.frame(450);
    const staleFrame = [...h.pending.values()][0];
    h.controller.travelTo(1000, 0);
    staleFrame(10000);
    expect(h.pending.size).toBe(1);
    expect(h.positions).toEqual([1000]);
    h.frame(500);
    expect(h.positions).toEqual([1000, 0]);
    expect(h.controller.isTravelling).toBe(false);
  });

  it('cancels pending travel when the new target is less than four pixels away', () => {
    const h = harness();
    h.controller.travelTo(0, 2000);
    h.controller.travelTo(100, 103);
    expect(h.controller.isTravelling).toBe(false);
    expect(h.pending.size).toBe(0);
    h.frame(5000);
    expect(h.positions).toEqual([]);
  });

  it('animates a distance of exactly four pixels', () => {
    const h = harness();
    h.controller.travelTo(100, 104);
    h.frame(500);
    expect(h.positions).toEqual([104]);
    expect(h.controller.isTravelling).toBe(false);
  });
  it.each([[0, 2000], [2000, 0]])('travels from %s to %s with eased frames and finishes exactly', (start, target) => {
    const h = harness();
    h.controller.travelTo(start, target);
    expect(h.controller.isTravelling).toBe(true);
    expect(h.pending.size).toBe(1);
    h.frame(225);
    h.frame(225);
    h.frame(225);
    h.frame(5000);
    expect(h.positions).toEqual([
      start + (target - start) * 0.125,
      start + (target - start) * 0.5,
      start + (target - start) * 0.875,
      target
    ]);
    expect(h.controller.isTravelling).toBe(false);
    expect(h.pending.size).toBe(0);
  });
});

describe('travel geometry and easing', () => {
  it.each([[0, 0], [0.25, 0.125], [0.5, 0.5], [0.75, 0.875], [1, 1]])('eases %s to %s', (input, expected) => {
    expect(travel.easeInOutQuad(input)).toBe(expected);
  });

  it('centers the target section and clamps at both scroll boundaries', () => {
    expect(travel.getTravelTarget({ offsetTop: 600, offsetHeight: 1200 }, 3000, 600)).toBe(900);
    expect(travel.getTravelTarget({ offsetTop: 0, offsetHeight: 200 }, 3000, 600)).toBe(0);
    expect(travel.getTravelTarget({ offsetTop: 2900, offsetHeight: 100 }, 3000, 600)).toBe(2400);
    expect(travel.getTravelTarget({ offsetTop: 0, offsetHeight: 200 }, 200, 600)).toBe(0);
  });

  it.each([[0, 500], [400, 500], [2000, 900], [-2000, 900], [10000, 3200]])('scales duration for distance %s to %s ms', (distance, duration) => {
    expect(travel.getTravelDuration(distance)).toBe(duration);
  });
});
