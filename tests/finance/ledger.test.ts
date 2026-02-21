import { expect, test } from 'vitest';
import { calculateDistribution } from '$lib/finance/ledger';

test('calculateDistribution basic', () => {
  const result = calculateDistribution(1000, 800, 0.1);
  expect(result.saccoLevy).toBe(80);
  // More assertions
});