/** Internal resolution (matches Godot viewport). */
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const SCROLL_SPEED = 500;
export const TILE_W = 1024 * 2.5;

/** Witch — values from [scenes/Witch.tscn](scenes/Witch.tscn) + [scripts/Witch.gd](scripts/Witch.gd) defaults where not overridden. */
export const WITCH = {
  startX: 114,
  startY: 350,
  spriteScale: 2.5,
  maxSpeed: 800,
  acceleration: 20,
  speedUp: 50,
  momentumSpeed: 30,
  decelerationFactor: 0.9,
  loseMomentum: 0.015,
  velocityFloor: 5,
  jumpStrength: 1200,
  jumpTime: 0.1,
  fallDuration: 0.4,
  fallAcceleration: 30,
  riseYThreshold: 300,
  riseYLimit: -50,
  riseYEnd: 600,
  riseSpeed: 900,
  fallThroughLimit: 450,
  fallYEnd: 200,
  safeCheck: 640,
  angleUp: (-40 * Math.PI) / 180,
  angleDown: (65 * Math.PI) / 180,
  /** Falling animation wobble (radians) */
  fallingKeyTimes: [0, 0.1, 0.2, 0.3],
  fallingKeyRot: [0, -0.349066, 0, 0.349066],
  /** Collision — Area2D circle */
  colliderR: 46,
  /** Wall clamp (derived from main.tscn walls + body collision) */
  minY: 62.4,
  maxY: 660.4,
};

export const STORE = {
  maxPearls: 10,
  jumpCost: 3,
  levelupCost: 6,
};

export const SPAWNER_X = 1350;
export const PEARL_Y_MIN = 0;
export const PEARL_Y_MAX = 400;
export const ENEMY_Y_MIN = 150;
export const ENEMY_Y_MAX = 600;

export const BIRD_VX = -700;
export const PEARL_VX = -SCROLL_SPEED;
export const PEARL_VY = 100;

export const SKULL = {
  aimX: 1200,
  initVx: -500,
  throwV: 1000,
  aimTime: 1.4,
  prelaunchTime: 0.3,
  prelaunchMod: [0.549, 0.549, 0.549, 1],
  colliderR: 38.28,
  spriteScale: 2.5,
};

/** Bird AABB in local space (half sizes), center roughly at body origin */
export const BIRD = {
  vx: BIRD_VX,
  halfW: (74 / 2) * 2.5,
  halfH: (39 / 2) * 2.5,
  offX: -2 * 2.5,
  offY: 0.5 * 2.5,
};

export const PEARL_R = 10;

/** Lighting enum matches LevelConfiguration */
export const LIGHTING = { DIMMED: 0, DARK: 1, LIGHT: 2 };
