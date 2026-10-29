import { AllocationModel } from '@ghostfolio/common/allocation-model-helper';
import { getTooltipOptions } from '@ghostfolio/common/chart-helper';
import { getLocale } from '@ghostfolio/common/helper';
import { ColorScheme } from '@ghostfolio/common/types';
import { AssetClass } from '@ghostfolio/prisma/enums';

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnChanges,
  OnDestroy,
  viewChild
} from '@angular/core';
import {
  Chart,
  ChartData,
  ScriptableContext,
  Tooltip,
  TooltipItem,
  TooltipOptions
} from 'chart.js';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';

import { getAllocationModelBlockLabel } from './allocation-model-chart.helper';
import { getAssetClassColor } from './allocation-model-colors';

interface AllocationModelBlock {
  assetClass: AssetClass;
  value: number;
}

/**
 * Draws the target allocation of a model as one block per asset class,
 * sized by its share. Unlike `gf-treemap-chart`, the blocks represent
 * categories, not holdings, so there is no performance coloring or click
 * navigation. The tooltip repeats the label for blocks too small to show it
 * in full.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-allocation-model-chart',
  styleUrls: ['./allocation-model-chart.component.scss'],
  templateUrl: './allocation-model-chart.component.html'
})
export class GfAllocationModelChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  public readonly colorScheme = input<ColorScheme>();
  public readonly locale = input<string | undefined>(getLocale());
  public readonly model = input.required<AllocationModel>();

  private chart: Chart<'treemap'>;
  private readonly chartCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

  public constructor() {
    Chart.register(Tooltip, TreemapController, TreemapElement);
  }

  public ngAfterViewInit() {
    this.initialize();
  }

  public ngOnChanges() {
    this.initialize();
  }

  public ngOnDestroy() {
    this.chart?.destroy();
  }

  private getBlock(context: ScriptableContext<'treemap'>) {
    return (context.raw as { _data?: AllocationModelBlock })?._data;
  }

  private getTooltipPluginConfiguration(): Partial<TooltipOptions<'treemap'>> {
    return {
      ...getTooltipOptions({
        colorScheme: this.colorScheme(),
        locale: this.locale()
      }),
      // @ts-expect-error: no need to set all attributes in callbacks
      callbacks: {
        label: (context: TooltipItem<'treemap'>) => {
          const block = (context.raw as { _data: AllocationModelBlock })._data;

          const { name, share } = getAllocationModelBlockLabel({
            ...block,
            locale: this.locale()
          });

          return `${name}: ${share}`;
        },
        title: () => {
          return '';
        }
      }
    };
  }

  private initialize() {
    const chartCanvas = this.chartCanvas();

    if (!chartCanvas) {
      return;
    }

    const blocks: AllocationModelBlock[] = Object.entries(this.model().targets)
      .filter(([, value]) => {
        return value > 0;
      })
      .map(([assetClass, value]) => {
        return { assetClass: assetClass as AssetClass, value };
      });

    const data: ChartData<'treemap'> = {
      datasets: [
        {
          backgroundColor: (context) => {
            const block = this.getBlock(context);

            return block
              ? getAssetClassColor(block.assetClass).backgroundColor
              : undefined;
          },
          borderRadius: 4,
          data: [],
          key: 'value',
          labels: {
            align: 'left',
            color: (context) => {
              const block = this.getBlock(context);

              return block
                ? getAssetClassColor(block.assetClass).fontColor
                : undefined;
            },
            display: true,
            font: [{ size: 14 }, { size: 14 }],
            formatter: (context) => {
              const block = this.getBlock(context);

              if (!block) {
                return '';
              }

              const { name, share } = getAllocationModelBlockLabel({
                ...block,
                locale: this.locale()
              });

              return [name, share];
            },
            position: 'top'
          },
          spacing: 1,
          // @ts-expect-error: tree accepts arbitrary objects
          tree: blocks
        }
      ]
    };

    if (this.chart) {
      this.chart.data = data;
      this.chart.options.plugins ??= {};
      this.chart.options.plugins.tooltip = this.getTooltipPluginConfiguration();
      this.chart.update();
    } else {
      this.chart = new Chart<'treemap'>(chartCanvas.nativeElement, {
        data,
        options: {
          animation: false,
          plugins: { tooltip: this.getTooltipPluginConfiguration() }
        },
        type: 'treemap'
      });
    }
  }
}
