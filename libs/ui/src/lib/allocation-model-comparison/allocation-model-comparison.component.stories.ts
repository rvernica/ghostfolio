import { PortfolioPosition } from '@ghostfolio/common/interfaces';

import { ANIMATION_MODULE_TYPE } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';

import { GfAllocationModelComparisonComponent } from './allocation-model-comparison.component';

const holdings = [
  {
    allocationInPercentage: 0.62,
    assetProfile: { assetClass: 'EQUITY' },
    valueInBaseCurrency: 6200
  },
  {
    allocationInPercentage: 0.25,
    assetProfile: { assetClass: 'FIXED_INCOME' },
    valueInBaseCurrency: 2500
  },
  {
    allocationInPercentage: 0.08,
    assetProfile: { assetClass: 'LIQUIDITY' },
    valueInBaseCurrency: 800
  },
  {
    allocationInPercentage: 0.05,
    assetProfile: {},
    valueInBaseCurrency: 500
  }
] as PortfolioPosition[];

export default {
  title: 'Allocation Model Comparison',
  component: GfAllocationModelComparisonComponent,
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        {
          provide: ANIMATION_MODULE_TYPE,
          useValue: 'NoopAnimations'
        }
      ]
    })
  ]
} as Meta<GfAllocationModelComparisonComponent>;

type Story = StoryObj<GfAllocationModelComparisonComponent>;

export const Default: Story = {
  args: {
    holdings,
    locale: 'en-US'
  }
};

export const Locked: Story = {
  args: {
    holdings,
    isComparisonLocked: true,
    locale: 'en-US'
  }
};

export const FilteredByAssetClass: Story = {
  args: {
    holdings,
    isFilteredByAssetClass: true,
    locale: 'en-US'
  }
};
