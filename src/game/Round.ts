import { FINISH_Y, ROUND_DURATION, START_LIVES } from './constants';

/** Событие раунда за кадр: показ полосы финиша или победа. */
export type RoundEvent = 'finishShown' | 'won' | null;

/**
 * Подсистема состояния раунда: жизни, монеты, время, момент появления финиша
 * и победы. Решения (что показать и какую скорость включить) принимает сцена.
 */
export class Round {
  private livesLeft = START_LIVES;
  private coinCount = 0;
  private secondsPassed = 0;
  private finished = false;
  private finishShown = false;

  get lives(): number {
    return this.livesLeft;
  }

  get coins(): number {
    return this.coinCount;
  }

  get elapsed(): number {
    return this.secondsPassed;
  }

  /** Раунд окончен (победа или проигрыш) — кадры игры не выполняются. */
  get isFinished(): boolean {
    return this.finished;
  }

  /** Начинает новый раунд: жизни и время сбрасываются, монеты сохраняются. */
  start(): void {
    this.livesLeft = START_LIVES;
    this.secondsPassed = 0;
    this.finished = false;
    this.finishShown = false;
  }

  /** Полный сброс монет (выход из игры в меню). */
  resetCoins(): void {
    this.coinCount = 0;
  }

  addCoins(count: number): void {
    this.coinCount += count;
  }

  /**
   * Продвигает время раунда и следит за финишем: сначала появляется полоса,
   * затем победа при её пересечении верхом дракона.
   */
  tick(seconds: number, playerTop: number): RoundEvent {
    if (this.finished) {
      return null;
    }
    this.secondsPassed += seconds;

    if (!this.finishShown && this.secondsPassed >= ROUND_DURATION) {
      this.finishShown = true;
    }
    if (this.finishShown && playerTop <= FINISH_Y) {
      this.finished = true;
      return 'won';
    }
    return this.finishShown ? 'finishShown' : null;
  }

  /** Обрабатывает столкновение с препятствием. Возвращает true при проигрыше. */
  registerHit(): boolean {
    this.livesLeft -= 1;
    if (this.livesLeft > 0) {
      return false;
    }
    this.finished = true;
    return true;
  }
}
