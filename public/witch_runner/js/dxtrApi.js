const GAME_ID = 'storm-witch';

export async function fetchGameConfig(patientId) {
  try {
    const res = await fetch(`/api/patients/${patientId}/game-config?gameId=${GAME_ID}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn('fetchGameConfig failed', e);
    return null;
  }
}

export async function completeSet(patientId, reps, setMetrics) {
  try {
    const res = await fetch('/api/daily-progress/complete-set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        gameId: GAME_ID,
        reps,
        setMetrics,
      }),
    });
    if (!res.ok) {
      console.warn('completeSet failed', res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn('completeSet failed', e);
    return null;
  }
}
