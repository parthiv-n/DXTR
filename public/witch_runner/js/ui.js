import { VIEW_W, VIEW_H, ORB_TEXTURE_PATH } from './constants.js';

export const ui = {
  gameStarted: false,
  inputSource: 'keyboard',
  restActive: false,
  restTimer: 0,
  setCompleteMsg: false,
  setCompleteMsgTimer: 0,
  sessionCompleteMsg: false,
  encourageMsg: '',
  encourageTimer: 0,
};

export function resetUi() {
  ui.gameStarted = false;
  ui.restActive = false;
  ui.restTimer = 0;
  ui.setCompleteMsg = false;
  ui.setCompleteMsgTimer = 0;
  ui.sessionCompleteMsg = false;
  ui.encourageMsg = '';
  ui.encourageTimer = 0;
}

export function startGameUi() {
  ui.gameStarted = true;
}

const ENCOURAGE_MSGS = [
  'Great grip!',
  'Keep it up!',
  'Nice squeeze!',
  'Well done!',
  'Strong grip!',
];

export function showEncouragement() {
  ui.encourageMsg = ENCOURAGE_MSGS[Math.floor(Math.random() * ENCOURAGE_MSGS.length)];
  ui.encourageTimer = 1.2;
}

export function showMissed() {
  ui.encourageMsg = 'Try again!';
  ui.encourageTimer = 1.2;
}

export function updateUi(dt) {
  if (ui.encourageTimer > 0) {
    ui.encourageTimer -= dt;
    if (ui.encourageTimer <= 0) {
      ui.encourageMsg = '';
    }
  }
  if (ui.setCompleteMsgTimer > 0) {
    ui.setCompleteMsgTimer -= dt;
    if (ui.setCompleteMsgTimer <= 0) {
      ui.setCompleteMsg = false;
    }
  }
  if (ui.restActive) {
    ui.restTimer -= dt;
    if (ui.restTimer <= 0) {
      ui.restActive = false;
      ui.restTimer = 0;
    }
  }
}

export function drawHUD(ctx, store, gripInput) {
  ctx.save();

  // --- Top-left: Rep / Set (offset right to avoid iframe Back button) ---
  ctx.font = 'bold 28px Outfit, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  const repDisplay = store.isSetComplete() ? store.repsPerSet : store.currentRep + 1;
  const repText = `Rep ${repDisplay} / ${store.repsPerSet}`;
  const setText = `Set ${store.currentSet + 1} / ${store.totalSets}`;
  ctx.fillText(`${repText}  ·  ${setText}`, 140, 40);

  // --- Top-right: Input source ---
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  let indicator = '';
  if (gripInput.mode === 'ble') indicator = '\u{1F7E2} BLE Connected';
  else if (gripInput.mode === 'serial') indicator = '\u{1F7E2} USB Connected';
  else if (gripInput.mode === 'keyboard' || gripInput.mode === 'sim') {
    if (gripInput.mode === 'sim') indicator = '\u{1F535} Simulation';
    else indicator = '\u2328\uFE0F Space Bar';
  }
  ctx.fillText(indicator, VIEW_W - 24, 40);

  // --- Bottom-centre: Grip force bar ---
  const barW = 440;
  const barH = 24;
  const barX = (VIEW_W - barW) / 2;
  const barY = VIEW_H - 100;

  // Dark backdrop behind bar area
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.roundRect(barX - 16, barY - 28, barW + 32, barH + 60, 16);
  ctx.fill();

  // Bar background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 12);
  ctx.fill();

  // Fill
  const fillW = Math.max(0, Math.min(1, gripInput.currentForce)) * barW;
  const gradient = ctx.createLinearGradient(barX, barY, barX + barW, barY);
  gradient.addColorStop(0, '#6B5344');
  gradient.addColorStop(0.5, '#c2e1a5');
  gradient.addColorStop(1, '#8eda5e');
  ctx.fillStyle = gradient;
  if (fillW > 2) {
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 12);
    ctx.fill();
  }

  // Threshold marker
  const threshX = barX + store.gripThreshold * barW;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(threshX, barY - 4);
  ctx.lineTo(threshX, barY + barH + 4);
  ctx.stroke();

  // Threshold label
  ctx.font = '14px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('threshold', threshX, barY - 8);

  // Hold-duration hint
  ctx.font = '15px Outfit, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'center';
  if (gripInput.connected && (gripInput.mode === 'ble' || gripInput.mode === 'serial')) {
    ctx.fillText('Hold your grip longer to rise higher', VIEW_W / 2, barY + barH + 22);
  } else if (gripInput.mode === 'keyboard' || (gripInput.mode === 'sim' && !gripInput.connected)) {
    ctx.fillText('Hold SPACE longer to rise higher', VIEW_W / 2, barY + barH + 22);
  }

  // --- Centre encouragement ---
  if (ui.encourageMsg && ui.encourageTimer > 0) {
    const alpha = Math.min(1, ui.encourageTimer / 0.3);
    ctx.font = 'bold 48px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(194, 225, 165, ${alpha})`;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.fillText(ui.encourageMsg, VIEW_W / 2, VIEW_H / 2 - 40);
  }

  // --- Set Complete overlay ---
  if (ui.setCompleteMsg) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.font = 'bold 64px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c2e1a5';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillText('Set Complete!', VIEW_W / 2, VIEW_H / 2 - 20);
  }

  // --- Rest timer ---
  if (ui.restActive && !ui.setCompleteMsg) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.font = 'bold 36px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText('Rest', VIEW_W / 2, VIEW_H / 2 - 40);
    ctx.font = 'bold 72px Outfit, sans-serif';
    ctx.fillStyle = '#c2e1a5';
    ctx.fillText(Math.ceil(ui.restTimer).toString(), VIEW_W / 2, VIEW_H / 2 + 40);
  }

  // --- Session Complete overlay ---
  if (ui.sessionCompleteMsg) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.font = 'bold 64px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c2e1a5';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.fillText('Session Complete!', VIEW_W / 2, VIEW_H / 2 - 20);
    ctx.font = '28px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Great work today!', VIEW_W / 2, VIEW_H / 2 + 30);
  }

  ctx.restore();
}

export function drawOrbs(ctx, orbs, images) {
  const img = images?.get(ORB_TEXTURE_PATH);
  const time = performance.now() / 1000;
  for (const o of orbs) {
    const pulse = 1 + Math.sin(time * 3) * 0.06;

    if (img && img.complete && img.naturalWidth > 0) {
      const w = 72 * pulse;
      const h = (img.naturalHeight / img.naturalWidth) * w;
      ctx.drawImage(img, o.x - w / 2, o.y - h / 2, w, h);
      continue;
    }

    const r = 18 * pulse;
    const glow = ctx.createRadialGradient(o.x, o.y, r * 0.3, o.x, o.y, r * 2.5);
    glow.addColorStop(0, 'rgba(194, 225, 165, 0.6)');
    glow.addColorStop(0.5, 'rgba(194, 225, 165, 0.2)');
    glow.addColorStop(1, 'rgba(194, 225, 165, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c2e1a5';
    ctx.beginPath();
    ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(o.x - r * 0.25, o.y - r * 0.25, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
