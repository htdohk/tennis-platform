import { canTransition, assertTransition } from './order-state-machine';

describe('OrderStateMachine', () => {
  describe('canTransition', () => {
    it('allows PENDING_CONFIRM → CONFIRMED', () => {
      expect(canTransition('PENDING_CONFIRM', 'CONFIRMED')).toBe(true);
    });

    it('allows PENDING_CONFIRM → CANCELLED', () => {
      expect(canTransition('PENDING_CONFIRM', 'CANCELLED')).toBe(true);
    });

    it('allows CONFIRMED → COMPLETED', () => {
      expect(canTransition('CONFIRMED', 'COMPLETED')).toBe(true);
    });

    it('allows CONFIRMED → CANCELLED', () => {
      expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
    });

    it('disallows PENDING_CONFIRM → COMPLETED (skip CONFIRMED)', () => {
      expect(canTransition('PENDING_CONFIRM', 'COMPLETED')).toBe(false);
    });

    it('disallows COMPLETED → CANCELLED (terminal)', () => {
      expect(canTransition('COMPLETED', 'CANCELLED')).toBe(false);
    });

    it('disallows CANCELLED → any (terminal)', () => {
      expect(canTransition('CANCELLED', 'CONFIRMED')).toBe(false);
      expect(canTransition('CANCELLED', 'COMPLETED')).toBe(false);
    });

    it('disallows COMPLETED → any (terminal)', () => {
      expect(canTransition('COMPLETED', 'CONFIRMED')).toBe(false);
    });

    it('allows RECRUITING transitions', () => {
      expect(canTransition('RECRUITING', 'CONFIRMED')).toBe(true);
      expect(canTransition('RECRUITING', 'CANCELLED')).toBe(true);
      expect(canTransition('RECRUITING', 'RECRUITING_EXPIRED')).toBe(true);
    });

    it('allows RECRUITING_EXPIRED → CONFIRMED (convert to normal)', () => {
      expect(canTransition('RECRUITING_EXPIRED', 'CONFIRMED')).toBe(true);
    });
  });

  describe('assertTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() =>
        assertTransition('PENDING_CONFIRM', 'CONFIRMED'),
      ).not.toThrow();
    });

    it('throws for invalid transitions', () => {
      expect(() => assertTransition('COMPLETED', 'CANCELLED')).toThrow(
        'Invalid state transition: COMPLETED → CANCELLED',
      );
    });
  });
});
