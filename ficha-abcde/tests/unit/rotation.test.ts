import { describe, expect, it } from 'vitest';
import { nextWorkout } from '../../src/domain/rotation';

describe('nextWorkout', () => {
  it('começa em A sem histórico', () => expect(nextWorkout(null)).toBe('A'));
  it('avança A→B→C→D→E', () => {
    expect(nextWorkout('A')).toBe('B');
    expect(nextWorkout('D')).toBe('E');
  });
  it('volta de E para A', () => expect(nextWorkout('E')).toBe('A'));
});
