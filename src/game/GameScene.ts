import Phaser from 'phaser';
import dragonUrl from './pictures/dracon.png';
import shieldUrl from './pictures/shield.png';
import {
  PLAYER_SPEED,
  PLAYER_SCALE,
  PLAYER_RADIUS,
  DRAGON_IMAGE_SIZE,
  PLAYER_HIT_TOP,
  PLAYER_HIT_DOWN,
  PLAYER_HIT_BOTTOM,
  PLAYER_HIT_STRIP_WIDTH,
  START_LIVES,
  COINS_PER_LEVEL,
  BASE_OBSTACLES,
  OBSTACLE_SIZE,
  OBSTACLE_DIAMETER,
  OBSTACLE_TEXTURE_SIZE,
  MAX_ROW_OCCUPANCY,
  ROWS,
  SCROLL_SPEED,
  ROUND_DURATION,
  START_X,
  START_Y,
  FINISH_Y,
  OBSTACLE_MIN_X,
  OBSTACLE_MAX_X,
  HINT_WRAP_WIDTH,
  PHASE_1_DURATION,
  PHASE_2_MULTIPLIER,
  MAX_OBSTACLES_PER_ROW,
} from './constants';

type ObstacleType = 'cloud' | 'whirlwind';

const OBSTACLE_TYPES: ObstacleType[] = ['cloud', 'whirlwind'];

/**
 * Игра «Драконьи погони».
 *
 * Дракон летит вверх, мир (фон и препятствия) движется навстречу. Игрок
 * стрелками уворачивается от грозовых туч и вихрей. Раунд длится
 * 20 секунд, после чего сверху появляется финиш. За прохождение уровня
 * начисляются золотые монеты викингов. Сообщения об успехе и провале
 * выводятся на щите.
 */
export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private background!: Phaser.GameObjects.Group;
  private finishBand!: Phaser.GameObjects.Rectangle;
  private shieldImage!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private levelText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private continueButton!: Phaser.GameObjects.Text;
  private exitButton!: Phaser.GameObjects.Text;
  private level = 1;
  private lives = START_LIVES;
  private coins = 0;
  private elapsed = 0;
  private isPlaying = true;
  private isPaused = false;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private phase = 1;
  private currentScrollSpeed = SCROLL_SPEED;
  private phaseText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.load.image('dragon', dragonUrl);
    this.load.image('shield', shieldUrl);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#1e3a8a');

    this.createObstacleTextures();
    this.createBackground();

    // Столкновение считается по «кресту»: центральная вертикаль + горизонтальная полоса.
    this.player = this.add.image(START_X, START_Y, 'dragon').setScale(PLAYER_SCALE);

    this.obstacles = this.physics.add.group();

    this.finishBand = this.add
      .rectangle(width / 2, FINISH_Y, width, 40, 0x22c55e)
      .setAlpha(0.5)
      .setVisible(false);

    this.add
      .text(
        width / 2,
        height - 20,
        'Стрелки - твоя уздечка. Двигай ими, чтобы не попасть в летящие навстречу припятствия, и получай монеты за каждый успешный полет',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '17px',
          color: '#ffffff',
          align: 'center',
          // Перенос в несколько строк по центру, чтобы не задевать угловой HUD.
          wordWrap: { width: HINT_WRAP_WIDTH, useAdvancedWrap: true },
        },
      )
      .setOrigin(0.5, 1);

    this.levelText = this.add.text(24, height - 100, `Уровень: ${this.level}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
    });
    this.livesText = this.add.text(24, height - 72, `Жизни: ${this.lives}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#f87171',
    });
    this.coinsText = this.add.text(24, height - 44, `Монеты: ${this.coins}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#facc15',
    });
    this.timerText = this.add
      .text(width - 24, height - 44, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#93c5fd',
      })
      .setOrigin(1, 0);
    this.phaseText = this.add
      .text(width - 24, height - 72, 'Фаза 1', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#93c5fd',
      })
      .setOrigin(1, 0);

    // Щит для сообщений об успехе и провале (увеличен в 2 раза).
    this.shieldImage = this.add
      .image(width / 2, height / 2 - 30, 'shield')
      .setScale(1.8)
      .setVisible(false);

    // Текст «будто высеченный на дереве»: тёмно-коричневый с светлой тенью снизу.
    this.messageText = this.add
      .text(width / 2, height / 2 - 30, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: '#3d2b1a',
        align: 'center',
      })
      .setOrigin(0.5)
      .setShadow(1, 1, '#9b6500', 0.9, true)
      .setVisible(false);

    this.hintText = this.add
      .text(width / 2, height / 2 + 30, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#3d2b1a',
      })
      .setOrigin(0.5)
      .setShadow(1, 1, '#9b6500', 0.9, true)
      .setVisible(false);

    this.continueButton = this.createButton(width / 2, height / 2 + 40, 'Продолжить', () => {
      this.level += 1;
      this.startLevel(true);
    });
    this.exitButton = this.createButton(width / 2, height / 2 + 100, 'Выйти', () => {
      this.level = 1;
      this.coins = 0;
      this.scene.start('MenuScene');
    });

    // Оверлей паузы: затемнение, заголовок и подсказка.
    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    const pauseTitle = this.add
      .text(width / 2, height / 2 - 20, 'Пауза', {
        fontFamily: 'Georgia, serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const pauseHint = this.add
      .text(width / 2, height / 2 + 40, 'P — продолжить', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.pauseOverlay = this.add
      .container(0, 0, [dim, pauseTitle, pauseHint])
      .setDepth(10)
      .setVisible(false);

    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-ENTER', () => {
      if (!this.isPlaying) {
        if (this.continueButton.visible) {
          this.level += 1;
        }
        this.startLevel(true);
      }
    });

    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());

    this.startLevel(true);
  }

  private togglePause(): void {
    if (!this.isPlaying) return;

    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.world.pause();
      this.pauseOverlay.setVisible(true);
    } else {
      this.physics.world.resume();
      this.pauseOverlay.setVisible(false);
    }
  }

  update(_time: number, delta: number): void {
    if (this.isPaused) return;
    if (!this.isPlaying) return;

    const seconds = delta / 1000;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown) dx -= 1;
    if (this.cursors.right.isDown) dx += 1;
    if (this.cursors.up.isDown) dy -= 1;
    if (this.cursors.down.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      this.player.x += (dx / length) * PLAYER_SPEED * seconds;
      this.player.y += (dy / length) * PLAYER_SPEED * seconds;
    }
    this.keepPlayerOnScreen();

    this.scrollBackground(seconds);

    this.obstacles.getChildren().forEach((child) => {
      const obstacle = child as Phaser.Physics.Arcade.Image;
      if (obstacle.y > this.scale.height + OBSTACLE_SIZE) {
        obstacle.destroy();
      }
    });
    this.checkObstacleCollision();

    this.elapsed += seconds;

    // Фаза 2 начинается после PHASE_1_DURATION секунд раунда.
    const nextPhase = this.elapsed < PHASE_1_DURATION ? 1 : 2;
    if (nextPhase !== this.phase) {
      this.phase = nextPhase;
      this.onPhaseChange();
    }
    this.timerText.setText(`До финиша: ${Math.max(0, ROUND_DURATION - Math.floor(this.elapsed))}`);
    this.phaseText.setText(`Фаза ${this.phase}`);

    if (this.elapsed >= ROUND_DURATION && !this.finishBand.visible) {
      this.finishBand.setVisible(true);
    }
    if (this.finishBand.visible && this.player.y - PLAYER_RADIUS <= FINISH_Y) {
      this.onFinish();
    }
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '25px',
        color: '#3d2b1a',
        padding: { x: 16, y: 5 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    button.on('pointerover', () => button.setStyle({ color: '#facc15' }));
    button.on('pointerout', () => button.setStyle({ color: '#ffffff' }));
    button.on('pointerdown', onClick);

    return button;
  }

  private keepPlayerOnScreen(): void {
    const half = this.player.displayWidth / 2;
    this.player.x = Phaser.Math.Clamp(this.player.x, half, this.scale.width - half);
    this.player.y = Phaser.Math.Clamp(this.player.y, PLAYER_RADIUS, this.scale.height - half);
  }

  private scrollBackground(seconds: number): void {
    this.background.getChildren().forEach((child) => {
      const dot = child as Phaser.GameObjects.Arc;
      dot.y += this.currentScrollSpeed * 0.4 * seconds;
      if (dot.y > this.scale.height + 20) {
        dot.y = -20;
        dot.x = Phaser.Math.Between(0, this.scale.width);
      }
    });
  }

  private checkObstacleCollision(): void {
    const halfW = this.player.displayWidth / 2;
    const top = this.player.y - this.player.displayHeight / 2;

    // Горизонтальная полоса креста: вся ширина, от 15 до 40px от верха картинки.
    const bandTop = top + PLAYER_HIT_TOP * PLAYER_SCALE;
    const bandBottom = top + PLAYER_HIT_DOWN * PLAYER_SCALE;

    // Центральная вертикаль креста: центральная треть ширины, от 15px до низа.
    const stripHalfW = (PLAYER_HIT_STRIP_WIDTH * PLAYER_SCALE) / 2;
    const stripTop = top + PLAYER_HIT_TOP * PLAYER_SCALE;
    const stripBottom = top + PLAYER_HIT_BOTTOM * PLAYER_SCALE;

    for (const child of this.obstacles.getChildren()) {
      const obstacle = child as Phaser.Physics.Arcade.Image;
      const oLeft = obstacle.x - OBSTACLE_SIZE;
      const oRight = obstacle.x + OBSTACLE_SIZE;
      const oTop = obstacle.y - OBSTACLE_SIZE;
      const oBottom = obstacle.y + OBSTACLE_SIZE;

      const bandHit =
        oLeft < this.player.x + halfW &&
        oRight > this.player.x - halfW &&
        oTop < bandBottom &&
        oBottom > bandTop;

      const stripHit =
        oLeft < this.player.x + stripHalfW &&
        oRight > this.player.x - stripHalfW &&
        oTop < stripBottom &&
        oBottom > stripTop;

      if (bandHit || stripHit) {
        this.onObstacleHit(obstacle);
        break;
      }
    }
  }

  private startLevel(resetLives: boolean): void {
    if (resetLives) {
      this.lives = START_LIVES;
    }
    this.isPlaying = true;
    this.isPaused = false;
    this.elapsed = 0;
    this.phase = 1;
    this.currentScrollSpeed = SCROLL_SPEED;
    this.pauseOverlay.setVisible(false);
    this.shieldImage.setVisible(false);
    this.messageText.setVisible(false);
    this.hintText.setVisible(false);
    this.continueButton.setVisible(false);
    this.exitButton.setVisible(false);
    this.finishBand.setVisible(false);
    this.physics.world.resume();

    this.obstacles.clear(true, true);
    this.generateLevel();

    this.player.setPosition(START_X, START_Y);

    this.levelText.setText(`Уровень: ${this.level}`);
    this.livesText.setText(`Жизни: ${this.lives}`);
    this.coinsText.setText(`Монеты: ${this.coins}`);
    this.phaseText.setText('Фаза 1');
    this.timerText.setText('');
  }

  private generateLevel(): void {
    const { width } = this.scale;
    const count = BASE_OBSTACLES + (this.level - 1);

    // Каждый ряд получает минимум 1 препятствие, остальные распределяем
    // случайно, не превышая 2/3 ширины ряда.
    const rowCounts = new Array<number>(ROWS).fill(1);
    let remaining = count - ROWS;
    while (remaining > 0) {
      const candidates: number[] = [];
      for (let r = 0; r < ROWS; r++) {
        if (
          rowCounts[r] < MAX_OBSTACLES_PER_ROW &&
          (rowCounts[r] + 1) * OBSTACLE_DIAMETER <= MAX_ROW_OCCUPANCY * width
        ) {
          candidates.push(r);
        }
      }
      if (candidates.length === 0) break;
      rowCounts[candidates[Phaser.Math.Between(0, candidates.length - 1)]] += 1;
      remaining -= 1;
    }

    const rowSpacing = (SCROLL_SPEED * ROUND_DURATION) / ROWS;
    for (let r = 0; r < ROWS; r++) {
      const y = -rowSpacing * (r + 1) - OBSTACLE_SIZE * 2;
      for (const x of this.randomRowPositions(rowCounts[r])) {
        const type = OBSTACLE_TYPES[Phaser.Math.Between(0, OBSTACLE_TYPES.length - 1)];
        const obstacle = this.obstacles.create(x, y, type) as Phaser.Physics.Arcade.Image;
        (obstacle.body as Phaser.Physics.Arcade.Body).setCircle(OBSTACLE_SIZE);
        obstacle.setVelocityY(SCROLL_SPEED);
      }
    }
  }

  /** Случайные X для ряда препятствий: без наложений, не более MAX_OBSTACLES_PER_ROW. */
  private randomRowPositions(count: number): number[] {
    const positions: number[] = [];
    let attempts = 0;
    while (positions.length < count && attempts < 300) {
      attempts += 1;
      const x = Phaser.Math.Between(OBSTACLE_MIN_X, OBSTACLE_MAX_X);
      if (positions.every((p) => Math.abs(p - x) >= OBSTACLE_DIAMETER)) {
        positions.push(x);
      }
    }
    return positions;
  }

  private onPhaseChange(): void {
    if (this.phase !== 2) return;

    this.currentScrollSpeed = SCROLL_SPEED * PHASE_2_MULTIPLIER;

    // Ускоряем уже летящие препятствия.
    this.obstacles.getChildren().forEach((child) => {
      (child as Phaser.Physics.Arcade.Image).setVelocityY(this.currentScrollSpeed);
    });

    // Добавляем 0.5 × базового количества препятствий (итого ×1.5).
    // Рядами по максимум MAX_OBSTACLES_PER_ROW, без наложений по X.
    const count = BASE_OBSTACLES + (this.level - 1);
    const extra = Math.round(count * (PHASE_2_MULTIPLIER - 1));
    const rowSpacing = (SCROLL_SPEED * ROUND_DURATION) / ROWS;
    for (let i = 0; i < extra; i += MAX_OBSTACLES_PER_ROW) {
      const rowCount = Math.min(MAX_OBSTACLES_PER_ROW, extra - i);
      const y = -OBSTACLE_SIZE * 2 - (i / MAX_OBSTACLES_PER_ROW) * rowSpacing;
      for (const x of this.randomRowPositions(rowCount)) {
        const type = OBSTACLE_TYPES[Phaser.Math.Between(0, OBSTACLE_TYPES.length - 1)];
        const obstacle = this.obstacles.create(x, y, type) as Phaser.Physics.Arcade.Image;
        (obstacle.body as Phaser.Physics.Arcade.Body).setCircle(OBSTACLE_SIZE);
        obstacle.setVelocityY(this.currentScrollSpeed);
      }
    }
  }

  private createObstacleTextures(): void {
    const size = OBSTACLE_TEXTURE_SIZE;
    const c = size / 2;

    // Грозовая туча — несколько серых кругов (вписывается в радиус OBSTACLE_SIZE).
    const cloud = this.add.graphics();
    cloud.fillStyle(0x64748b, 1);
    cloud.fillCircle(c, c, OBSTACLE_SIZE * 0.8);
    cloud.fillCircle(c - OBSTACLE_SIZE * 0.5, c + OBSTACLE_SIZE * 0.2, OBSTACLE_SIZE * 0.5);
    cloud.fillCircle(c + OBSTACLE_SIZE * 0.5, c + OBSTACLE_SIZE * 0.2, OBSTACLE_SIZE * 0.5);
    cloud.generateTexture('cloud', size, size);
    cloud.destroy();

    // Вихрь — концентрические окружности.
    const whirlwind = this.add.graphics();
    whirlwind.lineStyle(4, 0x93c5fd, 1);
    whirlwind.strokeCircle(c, c, OBSTACLE_SIZE * 0.4);
    whirlwind.strokeCircle(c, c, OBSTACLE_SIZE * 0.7);
    whirlwind.strokeCircle(c, c, OBSTACLE_SIZE);
    whirlwind.generateTexture('whirlwind', size, size);
    whirlwind.destroy();

  }

  private createBackground(): void {
    this.background = this.add.group();
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const size = Phaser.Math.Between(6, 16);
      this.background.add(this.add.circle(x, y, size, 0xbfdbfe, 0.25));
    }
  }

  private onObstacleHit(obstacle: Phaser.Physics.Arcade.Image): void {
    if (!this.isPlaying) return;

    obstacle.destroy();
    this.lives -= 1;
    this.livesText.setText(`Жизни: ${this.lives}`);

    if (this.lives <= 0) {
      this.isPlaying = false;
      this.physics.world.pause();
      this.shieldImage.setVisible(true);
      this.messageText.setText('Попробовать снова?').setVisible(true);
      this.hintText.setText('Нажми Enter').setVisible(true);
    }
  }

  private onFinish(): void {
    if (!this.isPlaying) return;

    this.coins += COINS_PER_LEVEL;
    this.coinsText.setText(`Монеты: ${this.coins}`);
    this.isPlaying = false;
    this.physics.world.pause();

    this.shieldImage.setVisible(true);
    this.messageText.setText('С победой, викинг!\nЛетим дальше').setVisible(true);
    this.continueButton.setVisible(true);
    this.exitButton.setVisible(true);
  }
}
