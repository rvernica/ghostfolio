import { AllocationComparisonRow } from '@ghostfolio/common/allocation-model-helper';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';

import OpenColor from 'open-color';

const { blue, cyan, grape, gray, orange, teal, yellow } = OpenColor;

const ASSET_CLASS_COLORS: Record<
  AllocationComparisonRow['assetClass'],
  { backgroundColor: string; fontColor: string }
> = {
  ALTERNATIVE_INVESTMENT: { backgroundColor: grape[8], fontColor: gray[0] },
  COMMODITY: { backgroundColor: yellow[5], fontColor: gray[9] },
  EQUITY: { backgroundColor: blue[9], fontColor: gray[0] },
  FIXED_INCOME: { backgroundColor: teal[9], fontColor: gray[0] },
  LIQUIDITY: { backgroundColor: cyan[3], fontColor: gray[9] },
  REAL_ESTATE: { backgroundColor: orange[6], fontColor: gray[9] },
  [UNKNOWN_KEY]: { backgroundColor: gray[5], fontColor: gray[9] }
};

/**
 * Keeps the chart blocks and the table row markers in the same color for
 * each asset class.
 */
export function getAssetClassColor(
  assetClass: AllocationComparisonRow['assetClass']
) {
  return ASSET_CLASS_COLORS[assetClass];
}
