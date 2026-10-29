import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { AssetClass } from '@ghostfolio/prisma/enums';

import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { GfAllocationModelComparisonComponent } from './allocation-model-comparison.component';

// Both components depend on Ionic, which this Jest setup cannot parse. With
// static imports of the component under test, the real modules still load
// in this spec, so the component is imported dynamically in `beforeEach`
jest.mock('../premium-indicator', () => {
  const angularCore: typeof import('@angular/core') =
    jest.requireActual('@angular/core');

  return {
    GfPremiumIndicatorComponent: angularCore.Component({
      selector: 'gf-premium-indicator',
      template: ''
    })(class {})
  };
});

jest.mock('../value', () => {
  const angularCore: typeof import('@angular/core') =
    jest.requireActual('@angular/core');

  return {
    GfValueComponent: angularCore.Component({
      inputs: ['isPercent', 'locale', 'position', 'precision', 'value'],
      selector: 'gf-value',
      template: '{{ (value * 100).toFixed(precision) }}%'
    })(class {})
  };
});

@Component({ selector: 'gf-allocation-model-chart', template: '' })
class GfAllocationModelChartStubComponent {
  public readonly colorScheme = input<string>();
  public readonly locale = input<string>();
  public readonly model = input<unknown>();
}

function createHolding({
  allocationInPercentage,
  assetClass,
  valueInBaseCurrency = allocationInPercentage * 1000
}: {
  allocationInPercentage: number;
  assetClass?: AssetClass;
  valueInBaseCurrency?: number;
}) {
  return {
    allocationInPercentage,
    assetProfile: { assetClass },
    valueInBaseCurrency
  } as PortfolioPosition;
}

describe('GfAllocationModelComparisonComponent', () => {
  let componentType: typeof GfAllocationModelComparisonComponent;
  let fixture: ComponentFixture<GfAllocationModelComparisonComponent>;

  function getText(selector: string) {
    return (
      fixture.nativeElement.querySelector(selector)?.textContent ?? ''
    ).replace(/\s+/g, ' ');
  }

  function getRow(assetClassLabel: string) {
    return Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('tbody tr')
    )
      .map(({ textContent }) => textContent.replace(/\s+/g, ' '))
      .find((text) => text.includes(assetClassLabel));
  }

  function render(inputs: Record<string, unknown> = {}) {
    fixture = TestBed.createComponent(componentType);

    fixture.componentRef.setInput('holdings', [
      createHolding({ allocationInPercentage: 0.6, assetClass: 'EQUITY' }),
      createHolding({ allocationInPercentage: 0.4, assetClass: 'FIXED_INCOME' })
    ]);
    fixture.componentRef.setInput('locale', 'en-US');

    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }

    fixture.detectChanges();
  }

  beforeEach(async () => {
    const { GfAllocationModelChartComponent } =
      await import('./allocation-model-chart.component');
    const { GfAllocationModelComparisonComponent } =
      await import('./allocation-model-comparison.component');

    componentType = GfAllocationModelComparisonComponent;

    await TestBed.configureTestingModule({
      imports: [GfAllocationModelComparisonComponent]
    })
      .overrideComponent(GfAllocationModelComparisonComponent, {
        add: { imports: [GfAllocationModelChartStubComponent] },
        remove: { imports: [GfAllocationModelChartComponent] }
      })
      .compileComponents();
  });

  it('Balanced is selected by default', () => {
    render();

    expect(getText('.allocation-model-name')).toContain('Balanced');
  });

  it('Each asset class row shows the current, model and signed difference', () => {
    render();

    expect(getRow('Equity')).toContain('60.0');
    expect(getRow('Equity')).toContain('50.0');
    expect(getRow('Equity')).toContain('+10.0%');
    expect(getRow('Liquidity')).toContain('-5.0%');
  });

  it('Basic users see the premium indicator and the model chart instead of the comparison table', () => {
    render({ isComparisonLocked: true });

    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('gf-premium-indicator')
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('gf-allocation-model-chart')
    ).not.toBeNull();
  });

  it('Current shares come from the holding values, as the allocation percentages of a filtered portfolio may not sum to 100%', () => {
    render({
      holdings: [
        createHolding({
          allocationInPercentage: 0.75,
          assetClass: 'EQUITY',
          valueInBaseCurrency: 3000
        }),
        createHolding({
          allocationInPercentage: 2.5,
          assetClass: 'LIQUIDITY',
          valueInBaseCurrency: 1000
        })
      ]
    });

    expect(getRow('Equity')).toContain('75.0%');
    expect(getRow('Liquidity')).toContain('25.0%');
  });

  it('In percentage view without values, current shares come from the allocation percentages', () => {
    render({
      holdings: [
        createHolding({
          allocationInPercentage: 0.6,
          assetClass: 'EQUITY',
          valueInBaseCurrency: null
        }),
        createHolding({
          allocationInPercentage: 0.4,
          assetClass: 'FIXED_INCOME',
          valueInBaseCurrency: null
        })
      ],
      isInPercentage: true
    });

    expect(getRow('Equity')).toContain('60.0%');
  });

  it('While the portfolio is loading, no comparison table is shown', () => {
    render({ isLoading: true });

    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('ngx-skeleton-loader')
    ).not.toBeNull();
  });

  it('An asset class filter shows a notice instead of the chart and the table', () => {
    render({ isFilteredByAssetClass: true });

    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('gf-allocation-model-chart')
    ).toBeNull();
    expect(getText('.allocation-model-filter-notice')).toContain(
      'Remove the asset class filter'
    );
  });

  it('Selecting the most aggressive model shows Aggressive and its equity target', () => {
    render();

    fixture.componentInstance.onModelIndexChange(4);
    fixture.detectChanges();

    expect(getText('.allocation-model-name')).toContain('Aggressive');
    expect(getRow('Equity')).toContain('85.0');
  });

  it('A difference that rounds to zero is shown without a sign', () => {
    render({
      holdings: [
        createHolding({ allocationInPercentage: 0.1, assetClass: 'EQUITY' }),
        createHolding({ allocationInPercentage: 0.2, assetClass: 'EQUITY' }),
        createHolding({ allocationInPercentage: 0.2, assetClass: 'EQUITY' })
      ]
    });

    const equityRow = getRow('Equity');

    expect(equityRow).toContain('0.0');
    expect(equityRow).not.toContain('-0.0%');
    expect(equityRow).not.toContain('+0.0%');
  });
});
