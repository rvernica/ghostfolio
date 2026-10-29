import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { AssetClass } from '@ghostfolio/prisma/enums';

export type AllocationModelId =
  | 'AGGRESSIVE'
  | 'BALANCED'
  | 'CONSERVATIVE'
  | 'GROWTH'
  | 'MODERATELY_CONSERVATIVE';

/**
 * A fixed target allocation per asset class that users compare their
 * portfolio against. Targets are fractions that sum to 1.
 */
export interface AllocationModel {
  id: AllocationModelId;
  targets: Record<AssetClass, number>;
}

export interface AllocationComparisonRow {
  assetClass: AssetClass | typeof UNKNOWN_KEY;
  current: number;
  difference: number;
  model: number;
}

const ASSET_CLASS_ORDER: AssetClass[] = [
  AssetClass.EQUITY,
  AssetClass.FIXED_INCOME,
  AssetClass.LIQUIDITY,
  AssetClass.REAL_ESTATE,
  AssetClass.COMMODITY,
  AssetClass.ALTERNATIVE_INVESTMENT
];

export const ALLOCATION_MODELS: AllocationModel[] = [
  {
    id: 'CONSERVATIVE',
    targets: {
      ALTERNATIVE_INVESTMENT: 0,
      COMMODITY: 0,
      EQUITY: 0.2,
      FIXED_INCOME: 0.65,
      LIQUIDITY: 0.15,
      REAL_ESTATE: 0
    }
  },
  {
    id: 'MODERATELY_CONSERVATIVE',
    targets: {
      ALTERNATIVE_INVESTMENT: 0,
      COMMODITY: 0,
      EQUITY: 0.35,
      FIXED_INCOME: 0.5,
      LIQUIDITY: 0.1,
      REAL_ESTATE: 0.05
    }
  },
  {
    id: 'BALANCED',
    targets: {
      ALTERNATIVE_INVESTMENT: 0,
      COMMODITY: 0.05,
      EQUITY: 0.5,
      FIXED_INCOME: 0.35,
      LIQUIDITY: 0.05,
      REAL_ESTATE: 0.05
    }
  },
  {
    id: 'GROWTH',
    targets: {
      ALTERNATIVE_INVESTMENT: 0,
      COMMODITY: 0.05,
      EQUITY: 0.65,
      FIXED_INCOME: 0.2,
      LIQUIDITY: 0.05,
      REAL_ESTATE: 0.05
    }
  },
  {
    id: 'AGGRESSIVE',
    targets: {
      ALTERNATIVE_INVESTMENT: 0,
      COMMODITY: 0.05,
      EQUITY: 0.85,
      FIXED_INCOME: 0.05,
      LIQUIDITY: 0,
      REAL_ESTATE: 0.05
    }
  }
];

export const DEFAULT_ALLOCATION_MODEL_ID: AllocationModelId = 'BALANCED';

/**
 * Compares the current allocation per asset class with a model, so users
 * can see how far their portfolio is from it. Current shares are derived
 * from the holding values rather than taken as given, because the holdings
 * of a filtered portfolio do not always sum to 100%. Holdings without an
 * asset class are reported as unknown rather than dropped, keeping totals
 * honest.
 */
export function getAllocationComparison({
  holdings,
  model
}: {
  holdings: { assetClass?: AssetClass; value: number }[];
  model: AllocationModel;
}): AllocationComparisonRow[] {
  const valueByAssetClass = new Map<
    AllocationComparisonRow['assetClass'],
    number
  >();
  let totalValue = 0;

  for (const { assetClass, value } of holdings) {
    const key = assetClass ?? UNKNOWN_KEY;

    valueByAssetClass.set(key, (valueByAssetClass.get(key) ?? 0) + value);
    totalValue += value;
  }

  const assetClasses: AllocationComparisonRow['assetClass'][] = [
    ...ASSET_CLASS_ORDER,
    UNKNOWN_KEY
  ];

  return assetClasses
    .map((assetClass) => {
      const current =
        totalValue > 0
          ? (valueByAssetClass.get(assetClass) ?? 0) / totalValue
          : 0;
      const target = assetClass === UNKNOWN_KEY ? 0 : model.targets[assetClass];

      return {
        assetClass,
        current,
        difference: current - target,
        model: target
      };
    })
    .filter(({ current, model: target }) => {
      return current !== 0 || target !== 0;
    });
}
