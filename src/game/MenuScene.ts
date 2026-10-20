import Phaser from 'phaser';
import finedragonUrl from './pictures/finedragon.png';
import {
  MENU_SKY_COLOR,
  MENU_DRAGON_DELAY_MS,
  MENU_DRAGON_SLIDE_SPEED,
  MENU_DRAGON_MAX_HEIGHT,
} from './constants';

/**
 * Стартовый экран игры «Драконьи погони».
 *
 * Синее небо и крупный заголовок в центральной части экрана. Спустя
 * MENU_DRAGON_DELAY_MS сверху выезжает картинка дракона, пока её верхний край
 * не совпадёт с верхней границей экрана. Под заголовком появляются надпись
 * «Полетаем?» и кнопка «Начать», запускающая игровую сцену.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  preload(): void {
    this.load.image('menu-dragon', finedragonUrl);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(MENU_SKY_COLOR);

    // Крупный заголовок в центральной части экрана. Лежит поверх дракона.
    const title = this.add
      .text(width / 2, height / 2, 'Драконьи погони', {
        fontFamily: 'Georgia, serif',
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setShadow(4, 4, '#0c4a6e', 1, true);
    title.setDepth(1);

    // Картинка дракона: базовый размер ограничен константой, затем увеличен в 3 раза.
    const source = this.textures.get('menu-dragon').getSourceImage();
    const baseScale = Math.min(1, MENU_DRAGON_MAX_HEIGHT / source.height);
    const scale = baseScale * 2;
    const displayHeight = source.height * scale;

    const dragon = this.add
      .image(width / 2, -displayHeight / 2, 'menu-dragon')
      .setScale(scale)
      .setVisible(false);

    this.time.delayedCall(MENU_DRAGON_DELAY_MS, () => {
      dragon.setVisible(true);
      this.tweens.add({
        targets: dragon,
        // Верхний край картинки останавливается на верхней границе экрана.
        y: displayHeight / 2,
        duration: (displayHeight / MENU_DRAGON_SLIDE_SPEED) * 1000,
        onComplete: () => this.showPrompt(width, height / 2),
      });
    });
  }

  private showPrompt(width: number, titleY: number): void {
    // Надпись и кнопка появляются под заголовком «Драконьи погони».
    const promptY = titleY + 70;

    this.add
      .text(width / 2, promptY, 'Полетаем?', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setShadow(2, 2, '#0c4a6e', 1, true);

    this.createStartButton(width / 2, promptY + 50);
  }

  private createStartButton(x: number, y: number): void {
    const button = this.add
      .text(x, y, 'Начать', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
        padding: { x: 24, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setStyle({ color: '#facc15' }));
    button.on('pointerout', () => button.setStyle({ color: '#ffffff' }));
    button.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
