import Lab from '@hapi/lab';
import { expect } from '@hapi/code';
import { sum } from '../src';

export const lab = Lab.script();

const { describe, it } = lab;

describe('sum', () => {
  it('sums two numbers', () => {
    expect(sum(1, 2)).to.be.equals(3);
    expect(sum(0, -3)).to.be.equals(-3);
  });
});
