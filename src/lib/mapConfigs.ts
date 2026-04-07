export interface MapConfig {
  originX: number;
  originZ: number;
  scale: number;
  image?: string;
}

export const MAP_CONFIGS: Record<string, MapConfig> = {
  AmbroseValley: { originX: -370, originZ: -473, scale: 900, image: "/maps/AmbroseValley_Minimap.png" },
  GrandRift: { originX: -290, originZ: -290, scale: 581, image: "/maps/GrandRift_Minimap.png" },
  Lockdown: { originX: -500, originZ: -500, scale: 1000, image: "/maps/Lockdown_Minimap.jpg" },
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
