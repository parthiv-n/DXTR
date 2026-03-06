import pygame
import random
import sys
import math

pygame.init()

# Constants
WIDTH, HEIGHT = 800, 600
FPS = 60
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)
GRAY = (169, 169, 169)
ORANGE = (255, 165, 0)
LIGHT_BLUE = (173, 216, 230)

# UFO path: straight line with wobble
UFO_SPEED = 0.0015
UFO_WOBBLE_AMOUNT = 25
UFO_W, UFO_H = 132, 98
PATH_LEFT, PATH_RIGHT = UFO_W // 2, WIDTH - UFO_W // 2
PATH_Y = HEIGHT // 3

# Cow size (used for spawn/respawn)
COW_W, COW_H = 40, 40

# Abduction radius (pixels) — change to widen/narrow the tractor beam
BEAM_WIDTH = 22

# How fast a cow slides up the beam (pixels per frame)
COW_SUCK_SPEED = 6
# Fraction of distance toward UFO center per frame (0–1) — cows gravitate toward beam center
COW_SUCK_DRIFT = 0.05
# Fade-out when cow contacts UFO: alpha decrease per frame (255 = opaque, 0 = invisible)
COW_FADE_SPEED = 30

# Create the game window
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Alien Abduction Game")
clock = pygame.time.Clock()

# --- Load images ---

def scale_to_cover(surface, target_w, target_h):
    sw, sh = surface.get_size()
    scale = max(target_w / sw, target_h / sh)
    new_w = int(sw * scale)
    new_h = int(sh * scale)
    return pygame.transform.scale(surface, (new_w, new_h))

sky_options = ["greysky.png", "lightningsky.png", "nightmoonsky.png", "purplesky.png"]
sky_bg = scale_to_cover(pygame.image.load(random.choice(sky_options)).convert(), WIDTH, HEIGHT)
grass_overlay = scale_to_cover(
    pygame.image.load("grass_background_transparent_sky.png").convert_alpha(), WIDTH, HEIGHT
)

# UFO frames: idle, beam1, beam2 (individual images)
ufo_idle = pygame.transform.scale(
    pygame.image.load("animation/ufo_idle.png").convert_alpha(), (UFO_W, UFO_H)
)
ufo_beam1 = pygame.transform.scale(
    pygame.image.load("animation/ufo_beam1.png").convert_alpha(), (UFO_W, UFO_H)
)
ufo_beam2 = pygame.transform.scale(
    pygame.image.load("animation/ufo_beam2.png").convert_alpha(), (UFO_W, UFO_H)
)
ufo_frames = [ufo_idle, ufo_beam1, ufo_beam2]

beam_img = pygame.image.load("animation/tractorbeam.png").convert_alpha()
cow_img = pygame.transform.scale(pygame.image.load("cow.png").convert_alpha(), (COW_W, COW_H))


def _find_non_overlapping_cow_pos(targets_list, sucking_list):
    """Return a Rect for a new cow that doesn't overlap any existing cow, or None."""
    all_rects = [t["rect"] for t in targets_list] + [c["rect"] for c in sucking_list]
    for _ in range(30):
        x = random.randint(0, WIDTH - COW_W)
        y = HEIGHT - COW_H
        new_rect = pygame.Rect(x, y, COW_W, COW_H)
        if not any(new_rect.colliderect(r) for r in all_rects):
            return new_rect
    return None


# --- Helper screens ---

def start_screen(scr):
    scr.fill(BLACK)
    font = pygame.font.Font(None, 30)
    intro_text = [
        "Welcome, Alien Abductor!",
        "You're behind on your weekly quota of abductions.",
        "Help the alien catch up by abducting targets on Earth!",
        "",
        "----------------------------------------------------------------------------------------------",
        "The UFO flies on its own.",
        "Press SPACE to stop and activate the tractor beam.",
        "Cows in the beam will be sucked up! Release SPACE to fly again.",
        "----------------------------------------------------------------------------------------------",
        "",
        "Press any key to start the game...",
        "",
    ]
    y = HEIGHT // 5
    for line in intro_text:
        text = font.render(line, True, WHITE)
        text_rect = text.get_rect(center=(WIDTH // 2, y))
        scr.blit(text, text_rect)
        y += 30
    pygame.display.flip()
    wait_for_key()


def wait_for_key():
    waiting = True
    while waiting:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            elif event.type == pygame.KEYDOWN:
                waiting = False


def show_text_on_screen(scr, text, font_size, y_position):
    font = pygame.font.Font(None, font_size)
    rendered = font.render(text, True, WHITE)
    rect = rendered.get_rect(center=(WIDTH // 2, y_position))
    scr.blit(rendered, rect)


def game_over_screen(scr):
    scr.fill(BLACK)
    show_text_on_screen(scr, "Game Over", 50, HEIGHT // 3)
    show_text_on_screen(scr, f"Your final score: {score}", 30, HEIGHT // 2)
    show_text_on_screen(scr, "Press any key to exit...", 20, HEIGHT * 2 // 3)
    pygame.display.flip()
    wait_for_key()


def victory_screen(scr):
    scr.fill(BLACK)
    show_text_on_screen(scr, "Congratulations!", 50, HEIGHT // 3)
    show_text_on_screen(scr, f"You've completed all levels with a score of {score}", 30, HEIGHT // 2)
    show_text_on_screen(scr, "Press any key to exit...", 20, HEIGHT * 2 // 3)
    pygame.display.flip()
    wait_for_key()


# --- Game state ---

player_rect = pygame.Rect(0, 0, UFO_W, UFO_H)
ufo_path_t = 0.0
beam_anim_counter = 0

# targets: list of pygame.Rect (idle cows on the ground)
targets = []

# sucking: list of dicts {rect, progress} for cows being pulled up
#   rect  — current pygame.Rect (moves upward each frame)
sucking = []

score = 0
font = pygame.font.Font(None, 36)
space_pressed = False

current_level = 1
abduction_target = 10
countdown_timer = 60
current_score = 0

target_spawn_counter = 0

# --- Start ---

start_screen(screen)

running = True

while running:
    # --- Events ---
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
            space_pressed = True
        elif event.type == pygame.KEYUP and event.key == pygame.K_SPACE:
            space_pressed = False

    # --- UFO movement (frozen while space held OR cows are still being sucked up) ---
    if not space_pressed and not sucking:
        ufo_path_t += UFO_SPEED
        if ufo_path_t >= 1:
            ufo_path_t = 0

    path_center = (PATH_LEFT + PATH_RIGHT) / 2
    path_half_width = (PATH_RIGHT - PATH_LEFT) / 2
    x = path_center + path_half_width * math.sin(ufo_path_t * 2 * math.pi)
    wobble = math.sin(ufo_path_t * math.pi * 10) * UFO_WOBBLE_AMOUNT
    player_rect.centerx = int(x)
    player_rect.centery = int(PATH_Y + wobble)

    # --- Spawn targets (keep 2-3 cows on screen) ---
    total_cows = len(targets) + len(sucking)
    target_spawn_rate = 90  # frames between spawns
    target_spawn_counter += 1
    if total_cows < 3 and target_spawn_counter >= target_spawn_rate:
        rect = _find_non_overlapping_cow_pos(targets, sucking)
        if rect:
            targets.append({'rect': rect, 'was_under_ufo': False})
        target_spawn_counter = 0

    # --- Cows under UFO (beam off) that UFO has passed over: disappear and respawn ---
    ufo_left = player_rect.left
    ufo_right = player_rect.right
    to_respawn = []
    for t in targets[:]:
        tr = t['rect']
        overlap = tr.x < ufo_right and tr.x + tr.w > ufo_left
        if overlap and not space_pressed:
            t['was_under_ufo'] = True
        if not overlap and t['was_under_ufo']:
            to_respawn.append(t)
    for t in to_respawn:
        targets.remove(t)
        rect = _find_non_overlapping_cow_pos(targets, sucking)
        if rect:
            targets.append({'rect': rect, 'was_under_ufo': False})

    # --- Beam: detect new cows entering beam and start sucking them ---
    if space_pressed:
        beam_rect = pygame.Rect(
            player_rect.centerx - BEAM_WIDTH // 2,
            player_rect.bottom,
            BEAM_WIDTH,
            HEIGHT - player_rect.bottom,
        )
        for target in targets[:]:
            if beam_rect.colliderect(target['rect']):
                targets.remove(target)
                sucking.append({'rect': pygame.Rect(target['rect']), 'fade': 255})

    # --- Animate sucking cows upward; fade out on physical contact with UFO ---
    for cow in sucking[:]:
        if cow.get('fading'):
            cow['fade'] -= COW_FADE_SPEED
            if cow['fade'] <= 0:
                sucking.remove(cow)
                current_score += 1
                score += 1
        else:
            cow['rect'].y -= COW_SUCK_SPEED
            delta = (player_rect.centerx - cow['rect'].centerx) * COW_SUCK_DRIFT
            cow['rect'].centerx += delta
            if cow['rect'].colliderect(player_rect):
                cow['fading'] = True
                cow['fade'] = 255

    # --- Draw ---

    screen.blit(sky_bg, sky_bg.get_rect(center=(WIDTH // 2, HEIGHT // 2)))
    screen.blit(grass_overlay, grass_overlay.get_rect(center=(WIDTH // 2, HEIGHT // 2)))

    # Tractor beam (behind UFO) — visible while space held OR cows still animating
    beam_active = space_pressed or bool(sucking)
    if beam_active:
        beam_height = HEIGHT - player_rect.bottom
        if beam_height > 0:
            beam_scaled = pygame.transform.scale(beam_img, (beam_img.get_width(), beam_height))
            screen.blit(
                beam_scaled,
                (player_rect.centerx - beam_img.get_width() // 2, player_rect.bottom),
            )

    # UFO sprite
    if beam_active:
        beam_anim_counter += 1
        frame_index = 1 + (beam_anim_counter // 8) % 2
    else:
        beam_anim_counter = 0
        frame_index = 0
    screen.blit(ufo_frames[frame_index], player_rect)

    # Idle cows
    for target in targets:
        screen.blit(cow_img, target['rect'])

    # Sucking cows (animate upward along beam; fade out on contact)
    for cow in sucking:
        if cow.get('fading'):
            cow_copy = cow_img.copy()
            cow_copy.set_alpha(max(0, int(cow['fade'])))
            screen.blit(cow_copy, cow['rect'])
        else:
            screen.blit(cow_img, cow['rect'])

    # HUD
    info_line_y = 10
    info_spacing = 75

    score_text = font.render(f"Score: {score}", True, WHITE)
    score_rect = score_text.get_rect(topleft=(10, info_line_y))
    pygame.draw.rect(screen, ORANGE, score_rect.inflate(10, 5))
    screen.blit(score_text, score_rect)

    level_text = font.render(f"Level: {current_level}", True, WHITE)
    level_rect = level_text.get_rect(topleft=(score_rect.topright[0] + info_spacing, info_line_y))
    pygame.draw.rect(screen, LIGHT_BLUE, level_rect.inflate(10, 5))
    screen.blit(level_text, level_rect)

    timer_text = font.render(f"Time: {int(countdown_timer)}", True, WHITE)
    timer_rect = timer_text.get_rect(topleft=(level_rect.topright[0] + info_spacing, info_line_y))
    pygame.draw.rect(screen, RED, timer_rect.inflate(10, 5))
    screen.blit(timer_text, timer_rect)

    targets_text = font.render(f"Abductions: {current_score}/{abduction_target}", True, WHITE)
    targets_rect = targets_text.get_rect(topleft=(timer_rect.topright[0] + info_spacing, info_line_y))
    pygame.draw.rect(screen, GRAY, targets_rect.inflate(10, 5))
    screen.blit(targets_text, targets_rect)

    pygame.display.flip()
    clock.tick(FPS)

    # --- Timer / level logic ---
    countdown_timer -= 1 / FPS
    if countdown_timer <= 0:
        if current_score < abduction_target:
            game_over_screen(screen)
            running = False
        else:
            current_level += 1
            if current_level <= 10:
                current_score = 0
                abduction_target = 10 * current_level
                countdown_timer = 60
            else:
                victory_screen(screen)
                running = False

    if current_score >= abduction_target:
        current_level += 1
        if current_level <= 10:
            current_score = 0
            abduction_target = 10 * current_level
            countdown_timer = 60
        else:
            victory_screen(screen)
            running = False

pygame.quit()
