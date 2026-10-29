import {
  ALLOCATION_MODELS,
  AllocationModelId,
  DEFAULT_ALLOCATION_MODEL_ID,
  getAllocationComparison
} from '@ghostfolio/common/allocation-model-helper';
import { getLocale } from '@ghostfolio/common/helper';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { ColorScheme } from '@ghostfolio/common/types';

import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal
} from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { translate } from '../i18n';
import { GfPremiumIndicatorComponent } from '../premium-indicator';
import { GfValueComponent } from '../value';
import { GfAllocationModelChartComponent } from './allocation-model-chart.component';
import { getAssetClassColor } from './allocation-model-colors';

const ALLOCATION_MODEL_TEXTS: Record<
  AllocationModelId,
  { description: string; name: string }
> = {
  AGGRESSIVE: {
    description: $localize`Seeks maximum long-term growth and accepts high volatility.`,
    name: $localize`Aggressive`
  },
  BALANCED: {
    description: $localize`Splits the portfolio between growth and stability for moderate long-term growth.`,
    name: $localize`Balanced`
  },
  CONSERVATIVE: {
    description: $localize`Emphasizes capital preservation and income, accepting lower long-term growth.`,
    name: $localize`Conservative`
  },
  GROWTH: {
    description: $localize`Favors long-term growth and accepts larger swings in value.`,
    name: $localize`Growth`
  },
  MODERATELY_CONSERVATIVE: {
    description: $localize`Leans toward income and stability with a modest allocation to growth assets.`,
    name: $localize`Moderately Conservative`
  }
};

/**
 * Lets users compare the asset class allocation of their portfolio with a
 * fixed set of model allocations, so they can see how far off they are and
 * rebalance toward a model.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfAllocationModelChartComponent,
    GfPremiumIndicatorComponent,
    GfValueComponent,
    MatSliderModule,
    NgxSkeletonLoaderModule
  ],
  selector: 'gf-allocation-model-comparison',
  styleUrls: ['./allocation-model-comparison.component.scss'],
  templateUrl: './allocation-model-comparison.component.html'
})
export class GfAllocationModelComparisonComponent {
  public readonly colorScheme = input<ColorScheme>();
  public readonly holdings = input.required<PortfolioPosition[]>();
  public readonly isComparisonLocked = input<boolean>(false);
  public readonly isFilteredByAssetClass = input<boolean>(false);
  public readonly isInPercentage = input(false, {
    transform: booleanAttribute
  });
  public readonly isLoading = input<boolean>(false);
  public readonly locale = input<string | undefined>(getLocale());

  protected readonly maxModelIndex = ALLOCATION_MODELS.length - 1;

  protected readonly selectedModelIndex = signal(
    ALLOCATION_MODELS.findIndex(({ id }) => {
      return id === DEFAULT_ALLOCATION_MODEL_ID;
    })
  );

  protected readonly selectedModel = computed(() => {
    return ALLOCATION_MODELS[this.selectedModelIndex()];
  });

  protected readonly selectedModelTexts = computed(() => {
    return ALLOCATION_MODEL_TEXTS[this.selectedModel().id];
  });

  protected readonly rows = computed(() => {
    return getAllocationComparison({
      holdings: this.holdings().map(
        ({ allocationInPercentage, assetProfile, valueInBaseCurrency }) => {
          return {
            assetClass: assetProfile?.assetClass,
            value: this.isInPercentage()
              ? allocationInPercentage
              : (valueInBaseCurrency ?? 0)
          };
        }
      ),
      model: this.selectedModel()
    }).map((row) => {
      return {
        ...row,
        color: getAssetClassColor(row.assetClass).backgroundColor,
        // The sign is neutral text rather than a colorized gain or loss, as
        // being above or below a model is neither good nor bad
        formattedDifference: `${(row.difference * 100).toLocaleString(
          this.locale(),
          {
            maximumFractionDigits: 1,
            minimumFractionDigits: 1,
            signDisplay: 'exceptZero'
          }
        )}%`,
        label: translate(row.assetClass)
      };
    });
  });

  public onModelIndexChange(index: number) {
    this.selectedModelIndex.set(index);
  }
}
