import Phaser from 'phaser';
import dragonUrl from './pictures/dracon_new.png';
import shieldUrl from './pictures/shield.png';
import backgroundUrl from './pictures/background.png';
import { BackgroundLayer } from './BackgroundLayer';
import { Hud } from './Hud';
import { ObstacleField } from './ObstacleField';
import { Phase } from './Phase';
import { Player } from './Player';
import { Round } from './Round';
import { COINS_PER_LEVEL, FINISH_Y, HIT_FREEZE_MS } from './constants';

/**
 * Игра «Драконьи погони».
 *
 * Сцена только координирует подсистемы: BackgroundLayer рисует игровое поле,
 * ObstacleField управляет препятствиями, Round хранит состояние раунда,
 * Player двигает дракона, Hud показывает индикаторы, Phase — правила фаз.
 */
export class GameScene extends Phaser.Scene {
  private background!: BackgroundLayer;
  private obstacles!: ObstacleField;
  private round!: Round;
  private gamePhase!: Phase;
  private player!: Player;
  private hud!: Hud;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private finishBand!: Phaser.GameObjects.Rectangle;
  private shieldImage!: Phaser.GameObjects.Image;
  private messageText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private continueButton!: Phaser.GameObjects.Text;
  private exitButton!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private hitText!: Phaser.GameObjects.Text;
  private level = 1;
  private isPaused = false;
  /** Микро-пауза после удара: мир на мгновение замирает. */
  private isFrozen = false;
  /** Ожидание нажатия Enter после потери последней жизни. */
  private isWaitingRetry = false;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.load.image('dragon', dragonUrl);
    this.load.image('shield', shieldUrl);
    this.load.image('background', backgroundUrl);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1e3a8a');

    this.background = new BackgroundLayer(this);
    this.obstacles = new ObstacleField(this);
    this.round = new Round();
    this.gamePhase = new Phase();
    this.registerKeys();
    this.player = new Player(this, this.wasd, this.cursors);
    this.createFinishBand();
    this.hud = new Hud(this);
    this.createMessageShield();
    this.createHitText();
    this.createPauseOverlay();

    this.startLevel();
  }

  update(_time: number, delta: number): void {
    if (this.isPaused || this.isFrozen || this.round.isFinished) return;

    const seconds = delta / 1000;
    this.player.update(seconds);
    this.background.update(seconds, this.round.elapsed);
    this.obstacles.update(seconds);

    const hit = this.obstacles.hitPlayer(this.player.image);
    if (hit) {
      this.onObstacleHit(hit);
    }

    const event = this.round.tick(seconds, this.player.top);
    this.updatePhase();
    this.hud.updateTimer(this.round.elapsed, this.gamePhase.number);

    if (event === 'won') {
      this.finishBand.setVisible(true);
      this.onFinish();
    } else if (event === 'finishShown') {
      this.finishBand.setVisible(true);
    }
  }

  /** Единственное место, где меняется состояние пользовательской паузы. */
  private setPaused(value: boolean): void {
    this.isPaused = value;
    this.pauseOverlay.setVisible(value);
    if (value) {
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
  }

  private togglePause(): void {
    if (this.round.isFinished) return;
    this.setPaused(!this.isPaused);
  }

  /** Синхронизирует фазу с монетами; вход в фазу 2 ускоряет препятствия и добавляет ряды. */
  private updatePhase(): void {
    if (!this.gamePhase.syncWithCoins(this.round.coins)) return;

    const speed = this.gamePhase.speed;
    this.obstacles.setSpeed(speed);
    this.obstacles.spawnExtraRows(this.level, speed);
  }

  private startLevel(): void {
    this.round.start();
    this.gamePhase.reset();
    this.finishBand.setVisible(false);
    this.setPaused(false);
    this.isWaitingRetry = false;
    this.hideOverlays();

    this.obstacles.reset();
    this.obstacles.generateLevel(this.level, this.gamePhase.speed);
    this.player.resetPosition();
    this.hud.refresh(this.level, this.round.lives, this.round.coins, this.gamePhase.number);
  }

  /** Скрывает щит с сообщением и кнопки (перед новым уровнем). */
  private hideOverlays(): void {
    this.shieldImage.setVisible(false);
    this.messageText.setVisible(false);
    this.hintText.setVisible(false);
    this.continueButton.setVisible(false);
    this.exitButton.setVisible(false);
  }

  /** Показывает щит с сообщением и (опционально) подсказкой. */
  private showMessage(message: string, hint = ''): void {
    this.shieldImage.setVisible(true);
    this.messageText.setText(message).setVisible(true);
    this.hintText.setText(hint).setVisible(true);
  }

  private onObstacleHit(obstacle: Phaser.Physics.Arcade.Image): void {
    this.obstacles.remove(obstacle);
    const lost = this.round.registerHit();
    this.hud.setLives(this.round.lives);

    this.microPause();
    if (lost) {
      this.isWaitingRetry = true;
      this.showMessage('Попробовать снова?', 'Нажми Enter');
    }
  }

  /** Микро-пауза после удара: мир замирает, крупно показывается «УДАР». */
  private microPause(): void {
    this.isFrozen = true;
    this.physics.world.pause();
    this.hitText.setVisible(true);
    this.time.delayedCall(HIT_FREEZE_MS, () => {
      this.isFrozen = false;
      this.hitText.setVisible(false);
      if (!this.isPaused && !this.isWaitingRetry && !this.round.isFinished) {
        this.physics.world.resume();
      }
    });
  }

  private onFinish(): void {
    this.round.addCoins(COINS_PER_LEVEL);
    this.hud.setCoins(this.round.coins);
    this.physics.world.pause();

    this.showMessage('С победой, викинг!\nЛетим дальше');
    this.continueButton.setVisible(true);
    this.exitButton.setVisible(true);
  }

  // --- Создание объектов -------------------------------------------------

  /** Зелёная полоса финиша: скрыта до истечения времени раунда. */
  private createFinishBand(): void {
    this.finishBand = this.add
      .rectangle(this.scale.width / 2, FINISH_Y, this.scale.width, 40, 0x22c55e)
      .setAlpha(0.5)
      .setVisible(false);
  }

  private createMessageShield(): void {
    const { width, height } = this.scale;

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
      this.startLevel();
    });
    this.exitButton = this.createButton(width / 2, height / 2 + 100, 'Выйти', () => {
      this.level = 1;
      this.round.resetCoins();
      this.scene.start('MenuScene');
    });
  }

  /** Крупная красная надпись «УДАР» на время микро-паузы. */
  private createHitText(): void {
    const { width, height } = this.scale;
    this.hitText = this.add
      .text(width / 2, height / 2, 'УДАР', {
        fontFamily: 'Georgia, serif',
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#ff0000',
      })
      .setOrigin(0.5)
      .setDepth(9)
      .setVisible(false);
  }

  private createPauseOverlay(): void {
    const { width, height } = this.scale;

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

  private registerKeys(): void {
    if (!this.input.keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard.on('keydown-ENTER', () => {
      if (!this.round.isFinished) return;
      if (this.continueButton.visible) {
        this.level += 1;
      }
      this.startLevel();
    });

    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
  }
}
