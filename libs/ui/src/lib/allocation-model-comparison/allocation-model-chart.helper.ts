import { AssetClass } from '@ghostfolio/prisma/enums';

import { translate } from '../i18n';

/**
 * Shared by the block labels and the tooltip of the allocation model chart,
 * so both name an asset class and its share the same way.
 */
export function getAllocationModelBlockLabel({
  assetClass,
  locale,
  value
}: {
  assetClass: AssetClass;
  locale?: string;
  value: number;
}) {
  return {
    name: translate(assetClass),
    share: `${(value * 100).toLocaleString(locale, {
      maximumFractionDigits: 0
    })}%`
  };
}
