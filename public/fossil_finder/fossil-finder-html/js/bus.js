const Bus = {
  _listeners: {},

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  },

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  },

  emit(event, ...args) {
    if (!this._listeners[event]) return;
    for (const cb of this._listeners[event]) cb(...args);
  },

  levelsInOrder: [
    {
      name: "velociraptor footprint",
      description: "He was a fairly small dinosaur with a hip height of about 60 cm, but fast and agile. His long, stiff tail helped with stability. (85 - 70 mio. years ago)",
      funFact: "You might be surprised to learn that velociraptors were actually covered in feathers, rather like a bird. They looked quite different from the scaly creatures you see in the films.",
      bestTimeSeconds: 15,
      thumbnail: "../assets/fossils/Skulls/fossil_footprint_velociraptor-1.png",
      fossilImage: "../assets/fossils/Footprints/fossil_footprint_velociraptor-5.png"
    },
    {
      name: "parasaurolophus skull",
      description: "A characteristic feature is the bone tooth, up to 1,5 meters long on his head, which he likely used to make sounds. He also had a duck-like beak. (76 - 73 mio. years ago)",
      funFact: "Scientists believe that long crest on its head may have worked rather like a trumpet. The creature could have used it to make loud honking sounds to communicate with others.",
      bestTimeSeconds: 30,
      thumbnail: "../assets/fossils/Skulls/fossil_skull_parasaurolophus-1.png",
      fossilImage: "../assets/fossils/Skulls/fossil_skull_parasaurolophus-5.png"
    },
    {
      name: "dilophosaurus skull",
      description: "The double crest on his head was a distinctive feature, for example, during mating. He grew up to 2,5 meters and weighed up to 500 kg, making him a very light dinosaur. (195 - 183 mio. years ago)",
      funFact: "Its name means \"two-crested lizard,\" and those bony crests on its head were probably used to attract mates or to show off during courtship.",
      bestTimeSeconds: 30,
      thumbnail: "../assets/fossils/Skulls/fossil_skull_dilophosaurus-1.png",
      fossilImage: "../assets/fossils/Skulls/fossil_skull_dilophosaurus-5.png"
    },
    {
      name: "brontosaurus footprint",
      description: "His name also means \"thunder lizard\". Due to his size and weight, he was very slow. However, he used his long tail for defense, whipping away his enemies. (156 - 146 mio. years ago)",
      funFact: "The name Brontosaurus means \"thunder lizard.\" Can you imagine the ground shaking when this fifteen-ton giant walked by? It must have been quite a sight.",
      bestTimeSeconds: 20,
      thumbnail: "../assets/fossils/Footprints/fossil_footprint_brontosaurus-1.png",
      fossilImage: "../assets/fossils/Footprints/fossil_footprint_brontosaurus-5.png"
    },
    {
      name: "tyrannosaurus skull",
      description: "With his powerful jaw and teeth up to 20 cm long, capable of an incredible bite force, he was the most dangerous dinosaur. When the young hatched, they were about half a meter tall. (68 - 66 mio. years ago)",
      funFact: "The Tyrannosaurus rex had the strongest bite of any land animal that has ever lived. Its jaws were powerful enough to crush bone.",
      bestTimeSeconds: 25,
      thumbnail: "../assets/fossils/Skulls/fossil_skull_tyrannosaurus-1.png",
      fossilImage: "../assets/fossils/Skulls/fossil_skull_tyrannosaurus-5.png"
    },
    {
      name: "avaceratops footprint",
      description: "His name also means \"Ava\u00b4s horned face\" and he resembled a smaller version of the triceratops with his frill. (76 - 72 mio. years ago)",
      funFact: "This creature was named after Ava Cole, who discovered the first fossil. It goes to show that anyone, even a young person, could make such a marvellous discovery.",
      bestTimeSeconds: 10,
      thumbnail: "../assets/fossils/Skulls/fossil_footprint_avaceratops-1.png",
      fossilImage: "../assets/fossils/Footprints/fossil_footprint_avaceratops-5.png"
    },
    {
      name: "triceratops skull",
      description: "He was also called \"three-horned-face\" or \"dinosaur rhino\" because of his three facial horns. The horns and the frill were used for defense against carnivores, decoration and communication. (70 - 65 mio. years ago)",
      funFact: "The triceratops had up to eight hundred teeth. They grew in something called batteries, so when one wore out, a new one would take its place. Quite remarkable, really.",
      bestTimeSeconds: 35,
      thumbnail: "../assets/fossils/Skulls/fossil_skull_triceratops-1.png",
      fossilImage: "../assets/fossils/Skulls/fossil_skull_triceratops-5.png"
    },
    {
      name: "tyrannosaurus footprint",
      description: "With his powerful jaw and teeth up to 20 cm long, capable of an incredible bite force, he was the most dangerous dinosaur. When the young hatched, they were about half a meter tall. (68 - 66 mio. years ago)",
      funFact: "When the young Tyrannosaurus rex hatched, they were only about three feet long. They grew to be forty times as large as adults. Isn't that astonishing?",
      bestTimeSeconds: 40,
      thumbnail: "../assets/fossils/Footprints/fossil_footprint_tyrannosaurus-1.png",
      fossilImage: "../assets/fossils/Footprints/fossil_footprint_tyrannosaurus-5.png"
    },
    {
      name: "baby triceratops footprint",
      description: "He was also called \"three-horned-face\" or \"dinosaur rhino\" because of his three facial horns. The horns and the frill were used for defense against carnivores, decoration and communication. (70 - 65 mio. years ago)",
      funFact: "Triceratops babies hatched from eggs that were about the size of a melon. When they were young, they could run on two legs, which is rather charming.",
      bestTimeSeconds: 20,
      thumbnail: "../assets/fossils/Footprints/fossil_footprint_triceratops-1.png",
      fossilImage: "../assets/fossils/Footprints/fossil_footprint_triceratops-5.png"
    },
    {
      name: "pteranodon skull",
      description: "He was a pterosaur but to take flight he would drop from high places or cliffs. He had a beak but no teeth. (85 - 75 mio. years ago)",
      funFact: "You might not know this, but the Pteranodon was not actually a dinosaur. It was a flying reptile. Its wingspan could reach twenty-three feet, about the size of a small airplane.",
      bestTimeSeconds: 45,
      thumbnail: "../assets/fossils/Skulls/fossil_skull_pteranodon-1.png",
      fossilImage: "../assets/fossils/Skulls/fossil_skull_pteranodon-5.png"
    }
  ],

  currentLevel: null,
  currentLevelIndex: -1,
  levelStars: {},
  levelPlayed: {},

  getCurrentLevel() {
    return this.currentLevel;
  },

  getLevelIndex() {
    return this.currentLevelIndex;
  },

  hasNextLevel() {
    return this.currentLevelIndex + 1 < this.levelsInOrder.length;
  },

  playLevelByIndex(index) {
    this.playLevel(this.levelsInOrder[index], index);
  },

  playLevel(level, index) {
    if (index === undefined) {
      index = this.levelsInOrder.indexOf(level);
    }
    this.currentLevel = level;
    this.currentLevelIndex = index;
    this.emit("on_level_selected", level, index);
  },

  playNextLevel() {
    if (this.hasNextLevel()) {
      this.playLevelByIndex(this.currentLevelIndex + 1);
    } else {
      this.emit("all_levels_complete");
    }
  },

  playSameLevel() {
    this.playLevel(this.currentLevel, this.currentLevelIndex);
  },

  markLevelPlayed(index, stars) {
    this.levelPlayed[index] = true;
    const prev = this.levelStars[index] || 0;
    if (stars > prev) this.levelStars[index] = stars;
    this.emit("on_stars", stars, index);
  }
};

export default Bus;
