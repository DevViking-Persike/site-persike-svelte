import { getSectionProgress, type SectionMetrics } from '../tunnel/progress';

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function getTravelTarget(section: SectionMetrics, scrollHeight: number, viewportHeight: number): number {
  return getSectionProgress(section, scrollHeight, viewportHeight) * Math.max(scrollHeight - viewportHeight, 0);
}

export interface TravelScheduler {
  now(): number;
  requestFrame(callback: (now: number) => void): number;
  cancelFrame(id: number): void;
}

/** Browser scheduling is injected so travel can be exercised without a DOM or WebGL. */
export function createTravelController(scheduler: TravelScheduler, setPosition: (position: number) => void) {
  let isTravelling = false;
  let frame = 0;
  let generation = 0;
  function cancel(): void {
    isTravelling = false;
    generation++;
    scheduler.cancelFrame(frame);
  }
  return {
    get isTravelling() { return isTravelling; },
    cancel,
    travelTo(start: number, target: number): void {
      cancel();
      if (Math.abs(target - start) < 4) return;
      const journey = generation;
      const duration = getTravelDuration(target - start);
      const startTime = scheduler.now();
      isTravelling = true;
      const step = (now: number) => {
        if (!isTravelling || journey !== generation) return;
        const t = Math.min((now - startTime) / duration, 1);
        setPosition(start + (target - start) * easeInOutQuad(t));
        if (t < 1) frame = scheduler.requestFrame(step);
        else isTravelling = false;
      };
      frame = scheduler.requestFrame(step);
    }
  };
}

export function getTravelDuration(distance: number): number {
  return Math.min(Math.max(Math.abs(distance) * 0.45, 500), 3200);
}
