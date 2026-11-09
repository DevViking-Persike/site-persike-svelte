import { describe, expect, it } from 'vitest';
import * as progress from '../../../src/lib/features/tunnel/tunnel/progress';

describe('tunnel progress', () => {
  it('selects the nearest gate ahead or behind, retaining section order on ties', () => {
    expect(progress.getTunnelProgress(-440, [-50, -350, -600]).stationIndex).toBe(1);
    expect(progress.getTunnelProgress(-550, [-50, -350, -600]).stationIndex).toBe(2);
    expect(progress.getTunnelProgress(-200, [-50, -350, -600]).stationIndex).toBe(0);
    expect(progress.getTunnelProgress(-350, [-50, -350, -600]).stationIndex).toBe(1);
    expect(progress.getTunnelProgress(-600, [-600]).stationIndex).toBe(0);
  });

  it('maps section centers to the same progress used by scroll and camera', () => {
    const viewportHeight = 600;
    const scrollHeight = 3000;
    const sections = [
      { offsetTop: 0, offsetHeight: 600 },
      { offsetTop: 600, offsetHeight: 1200 },
      { offsetTop: 1800, offsetHeight: 600 },
      { offsetTop: 2400, offsetHeight: 600 }
    ];
    const centers = sections.map((section) =>
      progress.getSectionProgress(section, scrollHeight, viewportHeight)
    );
    expect(centers).toEqual([0, 0.375, 0.75, 1]);
    const gates = centers.map(progress.getGatePosition);
    expect(gates).toEqual([-0, -247.5, -495, -660]);
    sections.forEach((section, index) => {
      const scrollTop = section.offsetTop + section.offsetHeight / 2 - viewportHeight / 2;
      const cameraZ = -progress.getScrollProgress(scrollTop, scrollHeight, viewportHeight) * 660;
      expect(cameraZ).toBe(gates[index]);
      expect(progress.getTunnelProgress(cameraZ, gates).stationIndex).toBe(index);
    });
  });

  it('bounds scroll and section progress at the endpoints and handles no overflow', () => {
    expect(progress.getScrollProgress(-20, 3000, 600)).toBe(0);
    expect(progress.getScrollProgress(9999, 3000, 600)).toBe(1);
    expect(progress.getScrollProgress(0, 600, 600)).toBe(0);
    expect(progress.getScrollProgress(0, 400, 600)).toBe(0);
    expect(progress.getSectionProgress({ offsetTop: 0, offsetHeight: 200 }, 3000, 600)).toBe(0);
    expect(progress.getSectionProgress({ offsetTop: 2900, offsetHeight: 100 }, 3000, 600)).toBe(1);
  });
  it('reports the camera position as a rounded, bounded percentage', () => {
    expect(progress.getTunnelProgress(0, [])).toEqual({ progress: 0, stationIndex: 0 });
    expect(progress.getTunnelProgress(-330, [])).toEqual({ progress: 50, stationIndex: 0 });
    expect(progress.getTunnelProgress(-663, [])).toEqual({ progress: 100, stationIndex: 0 });
    expect(progress.getTunnelProgress(10, [])).toEqual({ progress: 0, stationIndex: 0 });
    expect(progress.getTunnelProgress(-83, []).progress).toBe(13);
  });
});
