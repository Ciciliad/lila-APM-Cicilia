export interface MapConfig {
  originX: number;
  originZ: number;
  scale: number;
}

export const MAP_CONFIGS: Record<string, MapConfig> = {
  AmbroseValley: { originX: -370, originZ: -473, scale: 900 },
  GrandRift: { originX: -290, originZ: -290, scale: 581 },
  Lockdown: { originX: -500, originZ: -500, scale: 1000 },
};

export function worldToPixel(
  x: number,
  z: number,
  config: MapConfig,
  size: number = 1024
): { px: number; py: number } {
  const u = (x - config.originX) / config.scale;
  const v = (z - config.originZ) / config.scale;
  return {
    px: u * size,
    py: (1 - v) * size,
  };
}
