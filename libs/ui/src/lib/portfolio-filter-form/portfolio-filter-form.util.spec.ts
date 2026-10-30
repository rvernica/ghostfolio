import { PortfolioPosition } from '@ghostfolio/common/interfaces';

import { isSameHolding } from './portfolio-filter-form.util';

function makeHolding({
  dataSource,
  symbol
}: {
  dataSource: string;
  symbol: string;
}) {
  return {
    assetProfile: { dataSource, symbol }
  } as unknown as PortfolioPosition;
}

describe('isSameHolding', () => {
  it('matches two holding objects with the same data source and symbol', () => {
    expect(
      isSameHolding(
        makeHolding({ dataSource: 'YAHOO', symbol: 'HDV' }),
        makeHolding({ dataSource: 'YAHOO', symbol: 'HDV' })
      )
    ).toBe(true);
  });

  it('does not match holdings with the same symbol from different data sources', () => {
    expect(
      isSameHolding(
        makeHolding({ dataSource: 'YAHOO', symbol: 'HDV' }),
        makeHolding({ dataSource: 'MANUAL', symbol: 'HDV' })
      )
    ).toBe(false);
  });

  it('does not match a holding against no selection', () => {
    expect(
      isSameHolding(makeHolding({ dataSource: 'YAHOO', symbol: 'HDV' }), null)
    ).toBe(false);
  });
});
