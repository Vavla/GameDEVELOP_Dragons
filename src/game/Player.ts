import Phaser from 'phaser';
import { PLAYER_RADIUS, PLAYER_SCALE, PLAYER_SPEED, START_X, START_Y } from './constants';

/**
 * Дракон игрока: движение стрелками с нормализацией диагонали
 * и удержание в границах экрана. Сцена только вызывает update().
 */
export class Player {
  /** Картинка дракона — используется подсистемой препятствий для проверок столкновений. */
  readonly image: Phaser.GameObjects.Image;

  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor(scene: Phaser.Scene, cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    // Столкновение считается по «кресту»: центральная вертикаль + горизонтальная полоса.
    this.image = scene.add.image(START_X, START_Y, 'dragon').setScale(PLAYER_SCALE);
    this.cursors = cursors;
  }

  /** Верхняя кромка картинки (для проверки пересечения финиша). */
  get top(): number {
    return this.image.y - this.image.displayHeight / 2;
  }

  update(seconds: number): void {
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown) dx -= 1;
    if (this.cursors.right.isDown) dx += 1;
    if (this.cursors.up.isDown) dy -= 1;
    if (this.cursors.down.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      this.image.x += (dx / length) * PLAYER_SPEED * seconds;
      this.image.y += (dy / length) * PLAYER_SPEED * seconds;
    }
    this.keepOnScreen();
  }

  /** Возвращает дракона на стартовую позицию (новый уровень). */
  resetPosition(): void {
    this.image.setPosition(START_X, START_Y);
  }

  private keepOnScreen(): void {
    const half = this.image.displayWidth / 2;
    const { width, height } = this.image.scene.scale;
    this.image.x = Phaser.Math.Clamp(this.image.x, half, width - half);
    this.image.y = Phaser.Math.Clamp(this.image.y, PLAYER_RADIUS, height - half);
  }
}
