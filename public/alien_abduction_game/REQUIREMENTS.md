# Alien Abduction Game — Requirements Document

## 1. Overview

The Alien Abduction Game is a single-player arcade-style game built with Python and Pygame. The player controls an alien UFO that must abduct cows from Earth to meet a weekly quota. The game is designed for spacebar-only input: the UFO moves autonomously while the player holds SPACE to activate the tractor beam.

---

## 2. Functional Requirements

### 2.1 Controls

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | The game shall be playable using only the SPACE key. | Must |
| FR-2 | Holding SPACE shall activate the tractor beam. | Must |
| FR-3 | Releasing SPACE shall deactivate the tractor beam. | Must |
| FR-4 | Arrow keys or other movement keys shall not control the UFO. | Must |

### 2.2 UFO Behavior

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5 | The UFO shall move autonomously in a gentle oval trajectory across the screen. | Must |
| FR-6 | The UFO shall travel at a constant pace along the oval path. | Must |
| FR-7 | The UFO shall use a 3-frame spritesheet animation (idle, beam frame 1, beam frame 2). | Must |
| FR-8 | When the tractor beam is inactive, the UFO shall display the idle frame. | Must |
| FR-9 | When the tractor beam is active, the UFO shall alternate between beam frames at approximately 8 FPS. | Should |

### 2.3 Tractor Beam

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10 | The tractor beam shall be rendered as a graphic image extending from the UFO to the ground. | Must |
| FR-11 | The tractor beam shall only be visible when SPACE is held. | Must |
| FR-12 | Any cow that intersects the tractor beam shall be abducted (removed and counted toward the score). | Must |

### 2.4 Targets (Cows)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-13 | Cows shall spawn at the bottom of the screen at a rate determined by the current level. | Must |
| FR-14 | Cows shall spawn at random horizontal positions along the ground. | Must |
| FR-15 | Spawn rate shall decrease (cows spawn more frequently) as the level increases. | Must |

### 2.5 Progression

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-16 | The game shall have 10 levels. | Must |
| FR-17 | Each level shall have a 60-second countdown timer. | Must |
| FR-18 | Each level shall require a specific number of abductions: 10 × level. | Must |
| FR-19 | Completing the abduction quota before time expires shall advance to the next level. | Must |
| FR-20 | If the timer expires and the quota is not met, the game shall end (Game Over). | Must |
| FR-21 | Completing all 10 levels shall show the victory screen. | Must |

### 2.6 Visuals

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-22 | The sky background shall be randomly selected at game start from: greysky, lightningsky, nightmoonsky, purplesky. | Must |
| FR-23 | The grass_background_transparent_sky.png shall be drawn in front of the sky, with transparent regions allowing the sky to show through. | Must |
| FR-24 | Procedural stars shall be drawn over the sky and shall change color based on the current level. | Must |
| FR-25 | The HUD shall display: Score, Level, Time remaining, and Abductions (current/target). | Must |

### 2.7 Screens

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-26 | A start screen shall display instructions and wait for any key before starting. | Must |
| FR-27 | A game over screen shall display the final score and wait for any key before exiting. | Must |
| FR-28 | A victory screen shall display the final score and wait for any key before exiting. | Must |

---

## 3. Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1 | The game shall run at 60 FPS. | Must |
| NFR-2 | The game window shall be 800×600 pixels. | Must |
| NFR-3 | The game shall run on Windows with Python 3.x and Pygame. | Must |

---

## 4. Asset Requirements

| Asset | Path | Purpose |
|-------|------|---------|
| Sky backgrounds | greysky.png, lightningsky.png, nightmoonsky.png, purplesky.png | Random sky backdrop per game |
| Grass overlay | grass_background_transparent_sky.png | Foreground layer with transparent sky |
| UFO spritesheet | animation/ufo_spritesheet.png | 3 frames (66×49 each), 198×49 total |
| Tractor beam | animation/tractorbeam.png | Beam graphic (42×199) |
| Cow | cow.png | Target sprite |

---

## 5. Technical Stack

- **Language:** Python 3.x
- **Framework:** Pygame (pygame-ce 2.5+)
- **Standard library:** random, sys, math

---

## 6. Revision History

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2025-03-02 | Initial requirements document |
