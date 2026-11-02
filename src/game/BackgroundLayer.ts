import Phaser from 'phaser';
import {
  BACKGROUND_DIM_ALPHA,
  BACKGROUND_SCROLL_FACTOR,
  BACKGROUND_TILES,
  BG_SWAY_AMPLITUDE,
  BG_SWAY_SPEED,
  CLOUD_COUNT,
  CLOUD_MAX_ALPHA,
  CLOUD_MAX_SCALE,
  CLOUD_MIN_ALPHA,
  CLOUD_MIN_SCALE,
  CLOUD_SCROLL_FACTOR,
  CLOUD_SWAY_AMPLITUDE,
  CLOUD_SWAY_SPEED,
  SCROLL_SPEED,
} from './constants';

/**
 * Подсистема отрисовки игрового поля: зеркально прокручиваемый фон,
 * затемняющий слой и лёгкие перистые облака.
 * Игровая сцена только создаёт её и вызывает update().
 */
export class BackgroundLayer {
  private readonly scene: Phaser.Scene;
  private tiles: Phaser.GameObjects.Image[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createTiles();
    this.createDimOverlay();
    this.createCloudTexture();
    this.createClouds();
  }

  /** Прокручивает фон и облака; elapsed управляет фазами покачивания. */
  update(seconds: number, elapsed: number): void {
    this.scrollTiles(seconds, elapsed);
    this.updateClouds(seconds, elapsed);
  }

  /**
   * Две плитки фона в стек: нижняя — как есть, верхняя — отражённая по вертикали.
   * Зеркальная плитка стыкуется с обычной «цвет в цвет», поэтому шва не видно.
   */
  private createTiles(): void {
    const { width } = this.scene.scale;
    const source = this.scene.textures.get('background').getSourceImage();
    const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    for (let i = 0; i < BACKGROUND_TILES; i++) {
      this.tiles.push(
        this.scene.add
          .image(width / 2, sourceHeight / 2 - i * sourceHeight, 'background')
          .setFlipY(i % 2 === 1)
          .setDepth(-1),
      );
    }
  }

  /** Затемняющий слой между фоном и игровыми объектами — приглушает яркость моря. */
  private createDimOverlay(): void {
    const { width, height } = this.scene.scale;
    this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, BACKGROUND_DIM_ALPHA)
      .setDepth(0);
  }

  /** Мягкая «перьевая» текстура облака: набор полупрозрачных размытых пятен. */
  private createCloudTexture(): void {
    const width = 256;
    const height = 128;
    if (this.scene.textures.exists('cloud-wisp')) {
      this.scene.textures.remove('cloud-wisp');
    }
    const texture = this.scene.textures.createCanvas('cloud-wisp', width, height);
    if (!texture) {
      throw new Error('Canvas texture is unavailable.');
    }
    const context = texture.getContext();
    for (let i = 0; i < 16; i++) {
      const cx = Phaser.Math.Between(40, width - 40);
      const cy = Phaser.Math.Between(45, height - 45);
      const radius = Phaser.Math.Between(30, 80);
      const squish = Phaser.Math.FloatBetween(0.12, 0.3);
      const alpha = Phaser.Math.FloatBetween(0.05, 0.18);
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.save();
      context.translate(cx, cy);
      context.scale(1, squish);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    texture.refresh();
  }

  /** Лёгкие перистые облака над фоном. */
  private createClouds(): void {
    const { width, height } = this.scene.scale;
    for (let i = 0; i < CLOUD_COUNT; i++) {
      this.clouds.push(
        this.scene.add
          .image(
            Phaser.Math.Between(0, width),
            Phaser.Math.Between(0, height),
            'cloud-wisp',
          )
          .setScale(Phaser.Math.FloatBetween(CLOUD_MIN_SCALE, CLOUD_MAX_SCALE))
          .setAlpha(Phaser.Math.FloatBetween(CLOUD_MIN_ALPHA, CLOUD_MAX_ALPHA))
          .setDepth(0),
      );
    }
  }

  /** Фон плывёт вниз с постоянной скоростью (не зависит от фазы) и слегка покачивается. */
  private scrollTiles(seconds: number, elapsed: number): void {
    const { width, height } = this.scene.scale;
    const swayX = width / 2 + Math.sin(elapsed * BG_SWAY_SPEED) * BG_SWAY_AMPLITUDE;
    this.tiles.forEach((tile) => {
      tile.y += SCROLL_SPEED * BACKGROUND_SCROLL_FACTOR * seconds;
      tile.x = swayX;
      if (tile.y - tile.displayHeight / 2 > height) {
        tile.y -= tile.displayHeight * BACKGROUND_TILES;
        // При переносе наверх плитка становится соседкой другой плитки, поэтому
        // ориентация берётся противоположной ЕЁ текущей ориентации — тогда низ
        // новой верхней плитки зеркально продолжит верх нижней.
        const other = this.tiles.find((t) => t !== tile);
        if (other) {
          tile.setFlipY(!other.flipY);
        }
      }
    });
  }

  /** Облака плывут вниз медленнее фона (параллакс) и мягко покачиваются. */
  private updateClouds(seconds: number, elapsed: number): void {
    const { width, height } = this.scene.scale;
    this.clouds.forEach((cloud, index) => {
      cloud.y += SCROLL_SPEED * CLOUD_SCROLL_FACTOR * seconds;
      cloud.x +=
        Math.sin(elapsed * CLOUD_SWAY_SPEED + index * 1.7) * CLOUD_SWAY_AMPLITUDE * seconds;
      if (cloud.y - cloud.displayHeight / 2 > height) {
        cloud.y = -cloud.displayHeight / 2;
        cloud.x = Phaser.Math.Between(0, width);
      }
    });
  }
}
