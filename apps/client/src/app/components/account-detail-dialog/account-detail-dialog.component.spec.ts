import { UserService } from '@ghostfolio/client/services/user/user.service';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';
import { DataService } from '@ghostfolio/ui/services';

import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { GfAccountDetailDialogComponent } from './account-detail-dialog.component';
import { AccountDetailDialogParams } from './interfaces/interfaces';

function makeHolding({
  assetSubClass,
  dataSource,
  name,
  symbol
}: {
  assetSubClass: string;
  dataSource: string;
  name: string;
  symbol: string;
}) {
  return {
    assetProfile: { assetSubClass, dataSource, name, symbol }
  } as unknown as PortfolioPosition;
}

const closedHolding = makeHolding({
  assetSubClass: 'ETF',
  dataSource: 'YAHOO',
  name: 'iShares Core High Dividend ETF',
  symbol: 'HDV'
});

const activeHolding = makeHolding({
  assetSubClass: 'MUTUALFUND',
  dataSource: 'YAHOO',
  name: 'Fidelity ZERO Total Market Index',
  symbol: 'FZROX'
});

const cashHolding = makeHolding({
  assetSubClass: 'CASH',
  dataSource: 'MANUAL',
  name: 'USD',
  symbol: 'USD'
});

function setup() {
  const dataService = {
    fetchAccount: jest.fn().mockReturnValue(of({ tags: [] })),
    fetchAccountBalances: jest.fn().mockReturnValue(of({ balances: [] })),
    fetchActivities: jest
      .fn()
      .mockReturnValue(of({ activities: [], count: 0 })),
    fetchPortfolioHoldings: jest
      .fn()
      .mockReturnValue(
        of({ holdings: [closedHolding, cashHolding, activeHolding] })
      ),
    fetchPortfolioPerformance: jest
      .fn()
      .mockReturnValue(of({ chart: [], performance: {} }))
  };

  const data: AccountDetailDialogParams = {
    accountId: 'account-1',
    deviceType: 'desktop',
    hasPermissionToCreateActivity: true,
    hasPermissionToUpdateActivity: true,
    impersonationId: null
  };

  TestBed.configureTestingModule({
    providers: [
      { provide: DataService, useValue: dataService },
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: jest.fn() } },
      { provide: Router, useValue: { events: new Subject() } },
      { provide: UserService, useValue: { stateChanged: new Subject() } }
    ]
  });

  TestBed.overrideComponent(GfAccountDetailDialogComponent, {
    set: { imports: [], template: '' }
  });

  const component = TestBed.createComponent(
    GfAccountDetailDialogComponent
  ).componentInstance;

  component.ngOnInit();
  dataService.fetchActivities.mockClear();

  return { component, dataService };
}

describe('GfAccountDetailDialogComponent', () => {
  it('lists every non-cash holding of the account, including closed ones, sorted by name', () => {
    const { component, dataService } = setup();

    expect(dataService.fetchPortfolioHoldings).toHaveBeenCalledWith({
      filters: [{ id: 'account-1', type: 'ACCOUNT' }]
    });
    expect(component['holdingFilterOptions']).toEqual([
      activeHolding,
      closedHolding
    ]);
  });

  it('fetches the first page of the selected activity types', () => {
    const { component, dataService } = setup();
    component['pageIndex'] = 2;

    component['onTypesFilterChanged'](['DIVIDEND', 'SELL']);

    expect(dataService.fetchActivities).toHaveBeenCalledWith(
      expect.objectContaining({
        activityTypes: ['DIVIDEND', 'SELL'],
        filters: [{ id: 'account-1', type: 'ACCOUNT' }],
        skip: 0
      })
    );
  });

  it('fetches the first page of activities of the selected holding', () => {
    const { component, dataService } = setup();
    component['pageIndex'] = 2;

    component['holdingFilter'].setValue(closedHolding);

    expect(dataService.fetchActivities).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [
          { id: 'account-1', type: 'ACCOUNT' },
          { id: 'YAHOO', type: 'DATA_SOURCE' },
          { id: 'HDV', type: 'SYMBOL' }
        ],
        skip: 0
      })
    );
  });

  it('fetches all activities of the account once both filters are cleared', () => {
    const { component, dataService } = setup();
    component['onTypesFilterChanged'](['SELL']);
    component['holdingFilter'].setValue(closedHolding);

    component['onTypesFilterChanged']([]);
    component['holdingFilter'].setValue(null);

    expect(dataService.fetchActivities).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activityTypes: undefined,
        filters: [{ id: 'account-1', type: 'ACCOUNT' }]
      })
    );
  });
});
