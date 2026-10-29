import { getAllocationModelBlockLabel } from './allocation-model-chart.helper';

describe('getAllocationModelBlockLabel', () => {
  it('Names the asset class and its model share as a whole percentage', () => {
    expect(
      getAllocationModelBlockLabel({
        assetClass: 'FIXED_INCOME',
        locale: 'en-US',
        value: 0.05
      })
    ).toEqual({ name: 'Fixed Income', share: '5%' });
  });
});
