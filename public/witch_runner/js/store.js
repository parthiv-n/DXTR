export const store = {
  currentRep: 0,
  currentSet: 0,
  totalSets: 5,
  repsPerSet: 10,
  gripThreshold: 0.5,
  repResults: [],
  aboveThreshold: false,
  belowReset: true,
  sessionComplete: false,
  peakForce: 0,
  repStartTime: 0,

  reset() {
    this.currentRep = 0;
    this.currentSet = 0;
    this.repResults = [];
    this.aboveThreshold = false;
    this.belowReset = true;
    this.sessionComplete = false;
    this.peakForce = 0;
    this.repStartTime = 0;
  },

  recordRep(success, peakForce, reactionTimeMs) {
    this.repResults.push({
      repNumber: this.repResults.length + 1,
      expectedDirection: 'grip',
      actualDirection: success ? 'grip' : null,
      achievedAngle: Math.round(peakForce * 100),
      success,
      reactionTimeMs: reactionTimeMs != null ? Math.round(reactionTimeMs) : null,
    });
    this.currentRep = this.repResults.length;
  },

  flushSetReps() {
    const reps = [...this.repResults];
    this.repResults = [];
    this.currentRep = 0;
    this.currentSet += 1;
    this.aboveThreshold = false;
    this.belowReset = true;
    this.peakForce = 0;
    return reps;
  },

  isSetComplete() {
    return this.repResults.length >= this.repsPerSet;
  },

  isSessionComplete() {
    return this.currentSet >= this.totalSets;
  },
};
