import { PHASE_2_COINS, PHASE_2_MULTIPLIER, SCROLL_SPEED } from './constants';

/** Номер первой фазы. */
export const PHASE_1 = 1;

/** Номер второй фазы. */
export const PHASE_2 = 2;

/**
 * Подсистема фаз игры: хранит текущую фазу, вычисляет её по количеству монет
 * и сообщает о смене фазы. Что делать при смене (ускорить препятствия,
 * добавить ряды) — решает вызывающая сторона.
 */
export class Phase {
  private current = PHASE_1;

  /** Сбрасывает фазу к началу уровня. */
  reset(): void {
    this.current = PHASE_1;
  }

  /** Номер текущей фазы (для HUD). */
  get number(): number {
    return this.current;
  }

  /** Скорость мира, соответствующая текущей фазе. */
  get speed(): number {
    return this.current === PHASE_2 ? SCROLL_SPEED * PHASE_2_MULTIPLIER : SCROLL_SPEED;
  }

  /**
   * Синхронизирует фазу с накопленными монетами.
   * Возвращает true, если фаза сменилась (вход во вторую фазу).
   */
  syncWithCoins(coins: number): boolean {
    const next = coins < PHASE_2_COINS ? PHASE_1 : PHASE_2;
    if (next === this.current) {
      return false;
    }
    this.current = next;
    return true;
  }
}
