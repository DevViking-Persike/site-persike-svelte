export const TOTAL_TRAVEL = 660;

export interface SectionMetrics {
  offsetTop: number;
  offsetHeight: number;
}

export function getScrollProgress(scrollTop: number, scrollHeight: number, viewportHeight: number): number {
  return Math.min(Math.max(scrollTop / Math.max(scrollHeight - viewportHeight, 1), 0), 1);
}

/** Use the same scrollable range for DOM sections, gates and camera travel. */
export function getSectionProgress(section: SectionMetrics, scrollHeight: number, viewportHeight: number): number {
  return getScrollProgress(
    section.offsetTop + section.offsetHeight / 2 - viewportHeight / 2,
    scrollHeight,
    viewportHeight
  );
}

export function getGatePosition(progress: number): number {
  return -progress * TOTAL_TRAVEL;
}

/** Camera travels along -Z; ties retain the first station in section order. */
export function getTunnelProgress(cameraZ: number, gatePositions: readonly number[]) {
  let stationIndex = 0;
  let nearest = Infinity;
  gatePositions.forEach((position, index) => {
    const distance = Math.abs(position - cameraZ);
    if (distance < nearest) {
      nearest = distance;
      stationIndex = index;
    }
  });
  return {
    progress: Math.round(Math.min(Math.max(cameraZ / -TOTAL_TRAVEL, 0), 1) * 100),
    stationIndex
  };
}
