import {
  ALLOCATION_MODELS,
  DEFAULT_ALLOCATION_MODEL_ID,
  getAllocationComparison
} from '@ghostfolio/common/allocation-model-helper';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { AssetClass } from '@ghostfolio/prisma/enums';

describe('AllocationModelHelper', () => {
  const balancedModel = ALLOCATION_MODELS.find(({ id }) => {
    return id === 'BALANCED';
  });

  describe('Allocation models', () => {
    it('Every model sums to 100%', () => {
      for (const { targets } of ALLOCATION_MODELS) {
        const sum = Object.values(targets).reduce((a, b) => a + b, 0);

        expect(sum).toBeCloseTo(1, 10);
      }
    });

    it('Models are ordered from most conservative to most aggressive', () => {
      expect(ALLOCATION_MODELS.map(({ id }) => id)).toEqual([
        'CONSERVATIVE',
        'MODERATELY_CONSERVATIVE',
        'BALANCED',
        'GROWTH',
        'AGGRESSIVE'
      ]);
    });

    it('Balanced is the default with its target allocation', () => {
      expect(DEFAULT_ALLOCATION_MODEL_ID).toEqual('BALANCED');
      expect(balancedModel.targets).toEqual({
        ALTERNATIVE_INVESTMENT: 0,
        COMMODITY: 0.05,
        EQUITY: 0.5,
        FIXED_INCOME: 0.35,
        LIQUIDITY: 0.05,
        REAL_ESTATE: 0.05
      });
    });
  });

  describe('Get allocation comparison', () => {
    it('Holdings of the same asset class are summed and compared to the model', () => {
      const rows = getAllocationComparison({
        holdings: [
          { value: 0.3, assetClass: AssetClass.EQUITY },
          { value: 0.3, assetClass: AssetClass.EQUITY },
          { value: 0.4, assetClass: AssetClass.FIXED_INCOME }
        ],
        model: balancedModel
      });

      const equityRow = rows.find(({ assetClass }) => {
        return assetClass === AssetClass.EQUITY;
      });

      expect(equityRow.current).toBeCloseTo(0.6);
      expect(equityRow.model).toEqual(0.5);
      expect(equityRow.difference).toBeCloseTo(0.1);
    });

    it('Current shares are normalized by the total value, as the holdings of a filtered portfolio may not sum to 100%', () => {
      const rows = getAllocationComparison({
        holdings: [
          { assetClass: AssetClass.EQUITY, value: 3000 },
          { assetClass: AssetClass.LIQUIDITY, value: 1000 }
        ],
        model: balancedModel
      });

      expect(
        rows.find(({ assetClass }) => {
          return assetClass === AssetClass.EQUITY;
        }).current
      ).toEqual(0.75);
      expect(
        rows.find(({ assetClass }) => {
          return assetClass === AssetClass.LIQUIDITY;
        }).current
      ).toEqual(0.25);
    });

    it('Holdings without an asset class form an unknown row with a model of 0%', () => {
      const rows = getAllocationComparison({
        holdings: [
          { assetClass: AssetClass.EQUITY, value: 0.8 },
          { assetClass: undefined, value: 0.2 }
        ],
        model: balancedModel
      });

      expect(
        rows.find(({ assetClass }) => {
          return assetClass === UNKNOWN_KEY;
        })
      ).toEqual({
        assetClass: UNKNOWN_KEY,
        current: 0.2,
        difference: 0.2,
        model: 0
      });
    });

    it('Rows are ordered by asset class with unknown last, omitting rows where current and model are both 0%', () => {
      const rows = getAllocationComparison({
        holdings: [
          { value: 0.5, assetClass: undefined },
          { value: 0.5, assetClass: AssetClass.EQUITY }
        ],
        model: balancedModel
      });

      expect(rows.map(({ assetClass }) => assetClass)).toEqual([
        AssetClass.EQUITY,
        AssetClass.FIXED_INCOME,
        AssetClass.LIQUIDITY,
        AssetClass.REAL_ESTATE,
        AssetClass.COMMODITY,
        UNKNOWN_KEY
      ]);
    });

    it('An empty portfolio is compared as 0% in every model asset class', () => {
      const rows = getAllocationComparison({
        holdings: [],
        model: balancedModel
      });

      expect(rows).toHaveLength(5);

      for (const { current, difference, model } of rows) {
        expect(current).toEqual(0);
        expect(difference).toEqual(-model);
      }
    });
  });
});
