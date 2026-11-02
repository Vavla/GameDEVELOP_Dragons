import Phaser from 'phaser';
import { HINT_WRAP_WIDTH, ROUND_DURATION } from './constants';

/**
 * HUD: подсказка внизу экрана, уровень, жизни, монеты, таймер до финиша
 * и индикатор фазы. Сцена только вызывает методы обновления.
 */
export class Hud {
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly livesText: Phaser.GameObjects.Text;
  private readonly coinsText: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly phaseText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const { width, height } = scene.scale;

    scene.add
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

    this.levelText = scene.add.text(24, height - 100, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
    });
    this.livesText = scene.add.text(24, height - 72, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#f87171',
    });
    this.coinsText = scene.add.text(24, height - 44, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      color: '#facc15',
    });
    this.timerText = scene.add
      .text(width - 24, height - 44, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#93c5fd',
      })
      .setOrigin(1, 0);
    this.phaseText = scene.add
      .text(width - 24, height - 72, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#93c5fd',
      })
      .setOrigin(1, 0);
  }

  /** Полное обновление после старта уровня. */
  refresh(level: number, lives: number, coins: number, phase: number): void {
    this.levelText.setText(`Уровень: ${level}`);
    this.setLives(lives);
    this.setCoins(coins);
    this.phaseText.setText(`Фаза ${phase}`);
    this.timerText.setText('');
  }

  setLives(lives: number): void {
    this.livesText.setText(`Жизни: ${lives}`);
  }

  setCoins(coins: number): void {
    this.coinsText.setText(`Монеты: ${coins}`);
  }

  /** Ежекадровое обновление таймера и фазы. */
  updateTimer(elapsed: number, phase: number): void {
    this.timerText.setText(`До финиша: ${Math.max(0, ROUND_DURATION - Math.floor(elapsed))}`);
    this.phaseText.setText(`Фаза ${phase}`);
  }
}
