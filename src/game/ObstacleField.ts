import Phaser from 'phaser';
import {
  BASE_OBSTACLES,
  MAX_OBSTACLES_PER_ROW,
  MAX_PLACEMENT_ATTEMPTS,
  MAX_ROW_OCCUPANCY,
  MIN_ROW_FREE_WIDTH,
  OBSTACLE_DIAMETER,
  OBSTACLE_MAX_X,
  OBSTACLE_MIN_X,
  OBSTACLE_SIZE,
  OBSTACLE_TEXTURE_SIZE,
  PHASE_2_MULTIPLIER,
  PLAYER_HIT_BOTTOM,
  PLAYER_HIT_DOWN,
  PLAYER_HIT_STRIP_WIDTH,
  PLAYER_HIT_TOP,
  PLAYER_SCALE,
  ROUND_DURATION,
  ROWS,
  SCROLL_SPEED,
} from './constants';

export type ObstacleType = 'cloud' | 'whirlwind';

const OBSTACLE_TYPES: ObstacleType[] = ['cloud', 'whirlwind'];

/** Задание на генерацию одного ряда препятствий. */
interface RowSpec {
  y: number;
  count: number;
}

/** Габариты «креста» игрока для проверки столкновений. */
interface PlayerCross {
  centerX: number;
  halfW: number;
  bandTop: number;
  bandBottom: number;
  stripHalfW: number;
  stripTop: number;
  stripBottom: number;
}

/**
 * Подсистема препятствий: создаёт текстуры, генерирует ряды уровня,
 * удаляет улетевшие препятствия и проверяет столкновение с игроком.
 * Игровая сцена только вызывает методы и реагирует на результат.
 */
export class ObstacleField {
  private readonly scene: Phaser.Scene;
  private readonly group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.group = scene.physics.add.group();
    this.createTextures();
  }

  /** Генерирует препятствия уровня: минимум 1 в ряду, остаток распределяется случайно. */
  generateLevel(level: number, speed: number): void {
    const { width } = this.scene.scale;
    const count = BASE_OBSTACLES + (level - 1);
    const specs = this.buildRowSpecs(count, width);
    specs.forEach((spec) => this.spawnRow(spec.y, spec.count, speed));
  }

  /** Дополнительные препятствия второй фазы (итого ×PHASE_2_MULTIPLIER). */
  spawnExtraRows(level: number, speed: number): void {
    const extra = Math.round((BASE_OBSTACLES + (level - 1)) * (PHASE_2_MULTIPLIER - 1));
    const rowSpacing = (SCROLL_SPEED * ROUND_DURATION) / ROWS;
    for (let i = 0; i < extra; i += MAX_OBSTACLES_PER_ROW) {
      const count = Math.min(MAX_OBSTACLES_PER_ROW, extra - i);
      const y = -OBSTACLE_SIZE * 2 - (i / MAX_OBSTACLES_PER_ROW) * rowSpacing;
      this.spawnRow(y, count, speed);
    }
  }

  /** Ускоряет уже летящие препятствия. */
  setSpeed(speed: number): void {
    this.group.getChildren().forEach((child) => {
      (child as Phaser.Physics.Arcade.Image).setVelocityY(speed);
    });
  }

  /** Удаляет препятствия, улетевшие за нижний край экрана. */
  update(): void {
    this.group.getChildren().forEach((child) => {
      const obstacle = child as Phaser.Physics.Arcade.Image;
      if (obstacle.y > this.scene.scale.height + OBSTACLE_SIZE) {
        obstacle.destroy();
      }
    });
  }

  /**
   * Проверяет столкновение игрока с препятствиями по «кресту»: горизонтальная
   * полоса + центральная вертикаль. Возвращает задетое препятствие или null.
   */
  hitPlayer(player: Phaser.GameObjects.Image): Phaser.Physics.Arcade.Image | null {
    const cross = this.buildPlayerCross(player);
    for (const child of this.group.getChildren()) {
      const obstacle = child as Phaser.Physics.Arcade.Image;
      if (this.crossesPlayer(obstacle, cross)) {
        return obstacle;
      }
    }
    return null;
  }

  /** Убирает конкретное препятствие (например, после столкновения). */
  remove(obstacle: Phaser.Physics.Arcade.Image): void {
    obstacle.destroy();
  }

  /** Полная очистка перед новым уровнем. */
  reset(): void {
    this.group.clear(true, true);
  }

  /** Ряды уровня: по 1 препятствию в каждом + остаток, распределённый случайно. */
  private buildRowSpecs(count: number, width: number): RowSpec[] {
    const rowSpacing = (SCROLL_SPEED * ROUND_DURATION) / ROWS;
    const specs: RowSpec[] = [];
    for (let r = 0; r < ROWS; r++) {
      specs.push({ y: -rowSpacing * (r + 1) - OBSTACLE_SIZE * 2, count: 1 });
    }
    this.distributeRemaining(count - ROWS, specs, width);
    return specs;
  }

  /** Раскидывает оставшиеся препятствия по рядам в пределах лимитов ширины ряда. */
  private distributeRemaining(remaining: number, specs: RowSpec[], width: number): void {
    let left = remaining;
    while (left > 0) {
      const candidates = specs
        .map((spec, index) => ({ spec, index }))
        .filter(
          ({ spec }) =>
            spec.count < MAX_OBSTACLES_PER_ROW &&
            (spec.count + 1) * OBSTACLE_DIAMETER <= MAX_ROW_OCCUPANCY * width,
        );
      if (candidates.length === 0) return;
      const chosen = candidates[Phaser.Math.Between(0, candidates.length - 1)];
      chosen.spec.count += 1;
      left -= 1;
    }
  }

  /** Создаёт один ряд препятствий (общий путь для фазы 1 и фазы 2). */
  private spawnRow(y: number, count: number, speed: number): void {
    for (const x of this.randomRowPositions(count)) {
      const type = OBSTACLE_TYPES[Phaser.Math.Between(0, OBSTACLE_TYPES.length - 1)];
      const obstacle = this.group.create(x, y, type) as Phaser.Physics.Arcade.Image;
      (obstacle.body as Phaser.Physics.Arcade.Body).setCircle(OBSTACLE_SIZE);
      obstacle.setVelocityY(speed);
    }
  }

  /**
   * Случайные X для ряда препятствий: без наложений (пересечения устраняются
   * смещением) и с гарантированным проходом шириной с дракона.
   */
  private randomRowPositions(count: number): number[] {
    const positions: number[] = [];
    let attempts = 0;
    while (positions.length < count && attempts < MAX_PLACEMENT_ATTEMPTS) {
      attempts += 1;
      const x = this.resolveOverlap(
        Phaser.Math.Between(OBSTACLE_MIN_X, OBSTACLE_MAX_X),
        positions,
      );
      if (x !== null) {
        positions.push(x);
      }
    }
    this.ensureFreeGap(positions);
    if (positions.length < count) {
      console.warn(`randomRowPositions: размещено ${positions.length} из ${count} препятствий ряда.`);
    }
    return positions;
  }

  /**
   * Смещает X, устраняя пересечения с уже размещёнными препятствиями ряда.
   * Возвращает null, если смещением в пределах ряда пересечения устранить нельзя.
   */
  private resolveOverlap(x: number, positions: number[]): number | null {
    if (!positions.some((p) => Math.abs(p - x) < OBSTACLE_DIAMETER)) {
      return x;
    }
    for (const p of positions) {
      if (Math.abs(p - x) >= OBSTACLE_DIAMETER) continue;
      for (const candidate of [p - OBSTACLE_DIAMETER, p + OBSTACLE_DIAMETER]) {
        const shifted = Phaser.Math.Clamp(candidate, OBSTACLE_MIN_X, OBSTACLE_MAX_X);
        if (!positions.some((q) => Math.abs(q - shifted) < OBSTACLE_DIAMETER)) {
          return shifted;
        }
      }
    }
    return null;
  }

  /** Свободные сегменты ряда: от краёв ряда и между препятствиями. */
  private getFreeSegments(positions: number[]): number[] {
    const segments: number[] = [];
    let prevEdge = OBSTACLE_MIN_X;
    for (const p of [...positions].sort((a, b) => a - b)) {
      segments.push(p - OBSTACLE_SIZE - prevEdge);
      prevEdge = p + OBSTACLE_SIZE;
    }
    segments.push(OBSTACLE_MAX_X - prevEdge);
    return segments;
  }

  private hasFreeGap(positions: number[]): boolean {
    return Math.max(...this.getFreeSegments(positions)) >= MIN_ROW_FREE_WIDTH;
  }

  /**
   * Гарантирует непрерывный пустой отрезок шириной MIN_ROW_FREE_WIDTH:
   * смещает препятствие у самого широкого сегмента, при неудаче перевыбирает позицию.
   */
  private ensureFreeGap(positions: number[]): void {
    if (positions.length === 0) return;
    let attempts = 0;
    while (!this.hasFreeGap(positions) && attempts < MAX_PLACEMENT_ATTEMPTS) {
      attempts += 1;
      const segments = this.getFreeSegments(positions);
      let widest = 0;
      for (let i = 1; i < segments.length; i += 1) {
        if (segments[i] > segments[widest]) widest = i;
      }
      const missing = MIN_ROW_FREE_WIDTH - segments[widest];
      const isRightmost = widest === segments.length - 1;
      const sorted = [...positions].sort((a, b) => a - b);
      // Препятствие, ограничивающее самый широкий сегмент.
      const offender = isRightmost ? sorted[sorted.length - 1] : sorted[widest];
      const direction = isRightmost ? -1 : 1;
      const index = positions.indexOf(offender);
      const others = positions.filter((_, i) => i !== index);
      const shifted = this.resolveOverlap(
        Phaser.Math.Clamp(offender + direction * missing, OBSTACLE_MIN_X, OBSTACLE_MAX_X),
        others,
      );
      if (shifted !== null) {
        positions[index] = shifted;
        continue;
      }
      const rerolled = this.resolveOverlap(
        Phaser.Math.Between(OBSTACLE_MIN_X, OBSTACLE_MAX_X),
        others,
      );
      if (rerolled !== null) {
        positions[index] = rerolled;
      }
    }
    if (!this.hasFreeGap(positions)) {
      console.warn('randomRowPositions: не удалось гарантировать проход шириной с дракона.');
    }
  }

  /** Габариты «креста» игрока: горизонтальная полоса + центральная вертикаль. */
  private buildPlayerCross(player: Phaser.GameObjects.Image): PlayerCross {
    const top = player.y - player.displayHeight / 2;
    return {
      centerX: player.x,
      halfW: player.displayWidth / 2,
      bandTop: top + PLAYER_HIT_TOP * PLAYER_SCALE,
      bandBottom: top + PLAYER_HIT_DOWN * PLAYER_SCALE,
      stripHalfW: (PLAYER_HIT_STRIP_WIDTH * PLAYER_SCALE) / 2,
      stripTop: top + PLAYER_HIT_TOP * PLAYER_SCALE,
      stripBottom: top + PLAYER_HIT_BOTTOM * PLAYER_SCALE,
    };
  }

  /** Пересекается ли препятствие с «крестом» игрока. */
  private crossesPlayer(obstacle: Phaser.Physics.Arcade.Image, cross: PlayerCross): boolean {
    const oLeft = obstacle.x - OBSTACLE_SIZE;
    const oRight = obstacle.x + OBSTACLE_SIZE;
    const oTop = obstacle.y - OBSTACLE_SIZE;
    const oBottom = obstacle.y + OBSTACLE_SIZE;

    const bandHit =
      oLeft < cross.centerX + cross.halfW &&
      oRight > cross.centerX - cross.halfW &&
      oTop < cross.bandBottom &&
      oBottom > cross.bandTop;

    const stripHit =
      oLeft < cross.centerX + cross.stripHalfW &&
      oRight > cross.centerX - cross.stripHalfW &&
      oTop < cross.stripBottom &&
      oBottom > cross.stripTop;

    return bandHit || stripHit;
  }

  /** Текстуры препятствий: грозовая туча и вихрь. */
  private createTextures(): void {
    const size = OBSTACLE_TEXTURE_SIZE;
    const c = size / 2;

    // Грозовая туча — несколько серых кругов (вписывается в радиус OBSTACLE_SIZE).
    const cloud = this.scene.add.graphics();
    cloud.fillStyle(0x64748b, 1);
    cloud.fillCircle(c, c, OBSTACLE_SIZE * 0.8);
    cloud.fillCircle(c - OBSTACLE_SIZE * 0.5, c + OBSTACLE_SIZE * 0.2, OBSTACLE_SIZE * 0.5);
    cloud.fillCircle(c + OBSTACLE_SIZE * 0.5, c + OBSTACLE_SIZE * 0.2, OBSTACLE_SIZE * 0.5);
    cloud.generateTexture('cloud', size, size);
    cloud.destroy();

    // Вихрь — концентрические окружности.
    const whirlwind = this.scene.add.graphics();
    whirlwind.lineStyle(4, 0x93c5fd, 1);
    whirlwind.strokeCircle(c, c, OBSTACLE_SIZE * 0.4);
    whirlwind.strokeCircle(c, c, OBSTACLE_SIZE * 0.7);
    whirlwind.strokeCircle(c, c, OBSTACLE_SIZE);
    whirlwind.generateTexture('whirlwind', size, size);
    whirlwind.destroy();
  }
}
