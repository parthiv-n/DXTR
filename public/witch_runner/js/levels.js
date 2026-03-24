import { LIGHTING } from './constants.js';

/**
 * Six level configs from [main.tscn](main.tscn) LevelConfiguration resources.
 * bgId keys into BACKGROUNDS.
 * skyId keys into SKIES.
 */
export const LEVELS = [
  {
    bgId: 'lvl1',
    skyId: 'sky1',
    lighting: LIGHTING.DIMMED,
    rain: true,
    birdChance: 0,
    skullChance: 0,
    enemiesFrq: [0.2, 2.0],
  },
  {
    bgId: 'lvl2',
    skyId: 'sky2',
    lighting: LIGHTING.DIMMED,
    rain: true,
    birdChance: 1,
    skullChance: 0,
    enemiesFrq: [1.2, 4.5],
  },
  {
    bgId: 'lvl3',
    skyId: 'sky2',
    lighting: LIGHTING.DIMMED,
    rain: true,
    birdChance: 1,
    skullChance: 0,
    enemiesFrq: [0.5, 2.6],
  },
  {
    bgId: 'lvl4',
    skyId: 'sky4',
    lighting: LIGHTING.DARK,
    rain: true,
    birdChance: 2,
    skullChance: 1,
    enemiesFrq: [0.6, 2.9],
  },
  {
    bgId: 'lvl5',
    skyId: 'sky4',
    lighting: LIGHTING.DARK,
    rain: true,
    birdChance: 4,
    skullChance: 3,
    enemiesFrq: [0.6, 2.5],
  },
  {
    bgId: 'end',
    skyId: 'skyEnd',
    lighting: LIGHTING.LIGHT,
    rain: false,
    birdChance: 0,
    skullChance: 0,
    enemiesFrq: [4.0, 8.0],
  },
];

export const SKIES = {
  // Force a consistent night sky look across the session.
  sky1: 'assets/textures/sky_3.png',
  sky2: 'assets/textures/sky_3.png',
  sky4: 'assets/textures/sky_3.png',
  skyEnd: 'assets/textures/sky_3.png',
};

/**
 * Parallax / foreground strips. motionScale 0 = sky-only full-bleed layers omitted here.
 * y = top edge of drawn strip, h = polygon height in texture space, scale 2.5 applied.
 */
export const BACKGROUNDS = {
  lvl1: {
    hasForeground: true,
    fg: { tex: 'assets/textures/grass.png', y: 720 - 14 * 2.5, h: 14, bottom: true },
    layers: [
      { tex: 'assets/textures/field_3.png', motion: 0.2, y: 720 - 158 * 2.5, h: 158 },
      { tex: 'assets/textures/field_2.png', motion: 0.5, y: 720 - 115 * 2.5, h: 115 },
      { tex: 'assets/textures/field_1.png', motion: 0.8, y: 720 - 64 * 2.5, h: 64 },
    ],
  },
  lvl2: {
    hasForeground: false,
    layers: [
      { tex: 'assets/textures/mountains_4.png', motion: 0.1, y: 720 - 43 * 2.5, h: 43 },
      { tex: 'assets/textures/mountains_3.png', motion: 0.2, y: 720 - 52 * 2.5, h: 52 },
      { tex: 'assets/textures/mountains_2.png', motion: 0.3, y: 720 - 29 * 2.5, h: 29 },
      { tex: 'assets/textures/mountains_1.png', motion: 0.5, y: 720 - 21 * 2.5, h: 21 },
    ],
  },
  lvl3: {
    hasForeground: true,
    fg: { tex: 'assets/textures/clouds_storm_1.png', y: 0, h: 37, top: true },
    layers: [
      { tex: 'assets/textures/clouds_storm_4.png', motion: 0.3, y: 0, h: 51 },
      { tex: 'assets/textures/clouds_storm_3.png', motion: 0.6, y: 0, h: 48 },
      { tex: 'assets/textures/clouds_storm_2.png', motion: 0.8, y: 0, h: 43 },
    ],
  },
  lvl4: {
    hasForeground: true,
    fg: { tex: 'assets/textures/clouds_storm_1.png', y: 720 - 37 * 2.5, h: 37, bottom: true, flipY: true },
    layers: [
      { tex: 'assets/textures/clouds_inside_2.png', motion: 0.2, y: 0, h: 288 },
      { tex: 'assets/textures/clouds_inside_1.png', motion: 0.7, y: 50, h: 224 },
      { tex: 'assets/textures/clouds_storm_4.png', motion: 0.3, y: 720 - 51 * 2.5, h: 51, flipY: true },
      { tex: 'assets/textures/clouds_storm_3.png', motion: 0.6, y: 720 - 48 * 2.5, h: 48, flipY: true },
      { tex: 'assets/textures/clouds_storm_2.png', motion: 0.8, y: 720 - 43 * 2.5, h: 43, flipY: true },
    ],
  },
  lvl5: {
    hasForeground: true,
    fg: { tex: 'assets/textures/clouds_storm_1.png', y: 0, h: 37, top: true },
    layers: [
      { tex: 'assets/textures/clouds_inside_2.png', motion: 0.2, y: 0, h: 288 },
      { tex: 'assets/textures/clouds_inside_1.png', motion: 0.7, y: 140.74, h: 224 },
      { tex: 'assets/textures/clouds_storm_4.png', motion: 0.3, y: 0, h: 51 },
      { tex: 'assets/textures/clouds_storm_3.png', motion: 0.6, y: 0, h: 48 },
      { tex: 'assets/textures/clouds_storm_2.png', motion: 0.8, y: 0, h: 43 },
    ],
  },
  end: {
    hasForeground: true,
    fg: { tex: 'assets/textures/clouds_light_1.png', y: 720 - 37 * 2.5, h: 37, bottom: true },
    layers: [
      { tex: 'assets/textures/clouds_light_4.png', motion: 0.3, y: 720 - 51 * 2.5, h: 51 },
      { tex: 'assets/textures/clouds_light_3.png', motion: 0.6, y: 720 - 48 * 2.5, h: 48 },
      { tex: 'assets/textures/clouds_light_2.png', motion: 0.8, y: 720 - 43 * 2.5, h: 43 },
    ],
  },
};
