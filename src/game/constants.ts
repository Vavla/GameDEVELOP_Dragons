/** Скорость движения дракона (пикселей в секунду). */
export const PLAYER_SPEED = 310;

/** Масштаб картинки дракона (исходник 88×88). */
export const PLAYER_SCALE = 0.5;

/** Радиус коллизии дракона. */
export const PLAYER_RADIUS = 22;

/** Размер исходной картинки дракона (пикселей). */
export const DRAGON_IMAGE_SIZE = 88;

/** Итоговая ширина дракона на экране (исходник × масштаб). */
export const PLAYER_DISPLAY_WIDTH = DRAGON_IMAGE_SIZE * PLAYER_SCALE;

/** Минимальный непрерывный пустой отрезок в ряду препятствий (равен ширине дракона). */
export const MIN_ROW_FREE_WIDTH = PLAYER_DISPLAY_WIDTH;

/** Верх зоны столкновения дракона — 30px от верха картинки. */
export const PLAYER_HIT_TOP = 30;

/** Низ горизонтальной полосы креста — 80px от верха картинки. */
export const PLAYER_HIT_DOWN = 80;

/** Низ центральной вертикали креста — низ центральной трети картинки. */
export const PLAYER_HIT_BOTTOM = (2 / 3) * DRAGON_IMAGE_SIZE;

/** Ширина центральной вертикали креста — центральная треть картинки. */
export const PLAYER_HIT_STRIP_WIDTH = DRAGON_IMAGE_SIZE / 3;

/** Стартовое количество жизней. */
export const START_LIVES = 3;

/** Монеты за успешное прохождение уровня. */
export const COINS_PER_LEVEL = 10;

/** Количество препятствий на первом уровне. */
export const BASE_OBSTACLES = 10;

/** Радиус препятствия. */
export const OBSTACLE_SIZE = 45;

/** Диаметр препятствия (для проверки 2/3 ряда). */
export const OBSTACLE_DIAMETER = OBSTACLE_SIZE * 2;

/** Размер текстуры препятствия. */
export const OBSTACLE_TEXTURE_SIZE = OBSTACLE_SIZE * 3;

/** Максимальная доля ширины ряда, которую могут занимать препятствия. */
export const MAX_ROW_OCCUPANCY = 2 / 3;

/** Количество горизонтальных рядов препятствий на уровне. */
export const ROWS = 10;

/** Скорость движения мира навстречу дракону (пикселей в секунду). */
export const SCROLL_SPEED = 250;

/** Длительность раунда в секундах. */
export const ROUND_DURATION = 30;

/** Стартовая позиция дракона по X. */
export const START_X = 480;

/** Стартовая позиция дракона по Y. */
export const START_Y = 520;

/** Линия финиша (появляется сверху после 40 секунд). */
export const FINISH_Y = 40;

/** Лимит попыток размещения препятствия в ряду. */
export const MAX_PLACEMENT_ATTEMPTS = 300;

/** Минимальный X для препятствий. */
export const OBSTACLE_MIN_X = 60;

/** Максимальный X для препятствий. */
export const OBSTACLE_MAX_X = 900;

/** Цвет неба на стартовом экране. */
export const MENU_SKY_COLOR = '#4682B4';

/** Задержка перед выездом дракона на стартовом экране (мс). */
export const MENU_DRAGON_DELAY_MS = 2000;

/** Скорость выезда дракона (пикселей в секунду). */
export const MENU_DRAGON_SLIDE_SPEED = 300;

/** Базовый размер картинки дракона на стартовом экране (итоговый — ×3). */
export const MENU_DRAGON_MAX_HEIGHT = 200;

/** Доля скорости мира, с которой движется фон (не зависит от фазы). */
export const BACKGROUND_SCROLL_FACTOR = 0.4;

/** Количество плиток фона для бесконечной вертикальной прокрутки. */
export const BACKGROUND_TILES = 2;

/** Амплитуда покачивания фона по горизонтали (пикселей). */
export const BG_SWAY_AMPLITUDE = 60;

/** Частота покачивания фона (радиан в секунду). */
export const BG_SWAY_SPEED = 0.6;

/** Насколько затемнять фон (0 — не затемнять, 1 — полностью чёрный). */
export const BACKGROUND_DIM_ALPHA = 0.35;

/** Количество лёгких «перьевых» облаков над фоном. */
export const CLOUD_COUNT = 6;

/** Доля скорости мира, с которой плывут облака (меньше — облака «выше»). */
export const CLOUD_SCROLL_FACTOR = 0.25;

/** Минимальная и максимальная прозрачность облака. */
export const CLOUD_MIN_ALPHA = 0.4;
export const CLOUD_MAX_ALPHA = 0.8;

/** Минимальный и максимальный масштаб облака. */
export const CLOUD_MIN_SCALE = 0.8;
export const CLOUD_MAX_SCALE = 1.8;

/** Амплитуда и частота покачивания облаков (пиксели в секунду, радиан в секунду). */
export const CLOUD_SWAY_AMPLITUDE = 12;
export const CLOUD_SWAY_SPEED = 0.4;

/** Ширина переноса подсказки внизу игрового экрана (чтобы не задевала HUD). */
export const HINT_WRAP_WIDTH = 600;

/** Количество монет, после накопления которых начинается вторая фаза. */
export const PHASE_2_COINS = 10;

/** Множитель скорости и количества препятствий во второй фазе. */
export const PHASE_2_MULTIPLIER = 1.2;

/** Скорость вращения чёрной дыры (радиан в секунду). */
export const BLACK_HOLE_ROTATION_SPEED = 2.5;

/** Длительность микро-паузы после удара (мс). */
export const HIT_FREEZE_MS = 500;

/** Максимальное количество препятствий в одном ряду. */
export const MAX_OBSTACLES_PER_ROW = 3;