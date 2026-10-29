import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { AssetClass } from '@ghostfolio/prisma/enums';

import { getAssetClassColor } from './allocation-model-colors';

function getRelativeLuminance(hexColor: string) {
  const [red, green, blue] = [1, 3, 5].map((index) => {
    const channel = parseInt(hexColor.slice(index, index + 2), 16) / 255;

    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastRatio(colorA: string, colorB: string) {
  const [lighter, darker] = [
    getRelativeLuminance(colorA),
    getRelativeLuminance(colorB)
  ].sort((a, b) => b - a);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('getAssetClassColor', () => {
  it.each([...Object.values(AssetClass), UNKNOWN_KEY])(
    'Labels on %s blocks meet the WCAG AA contrast ratio of 4.5:1',
    (assetClass) => {
      const { backgroundColor, fontColor } = getAssetClassColor(assetClass);

      expect(
        getContrastRatio(backgroundColor, fontColor)
      ).toBeGreaterThanOrEqual(4.5);
    }
  );
});
