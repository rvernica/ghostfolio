import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_DATE_RANGE,
  DEFAULT_PAGE_SIZE,
  NUMERICAL_PRECISION_THRESHOLD_3_FIGURES,
  NUMERICAL_PRECISION_THRESHOLD_4_FIGURES
} from '@ghostfolio/common/config';
import { CreateAccountBalanceDto } from '@ghostfolio/common/dtos';
import { DATE_FORMAT, downloadAsFile } from '@ghostfolio/common/helper';
import {
  AccountBalancesResponse,
  Activity,
  Filter,
  LineChartItem,
  PortfolioPosition,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import type { Tag } from '@ghostfolio/prisma/browser';
import { GfAccountBalancesComponent } from '@ghostfolio/ui/account-balances';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfDialogFooterComponent } from '@ghostfolio/ui/dialog-footer';
import { GfDialogHeaderComponent } from '@ghostfolio/ui/dialog-header';
import { GfHoldingsTableComponent } from '@ghostfolio/ui/holdings-table';
import { translate } from '@ghostfolio/ui/i18n';
import { GfInvestmentChartComponent } from '@ghostfolio/ui/investment-chart';
import {
  getHoldingsForFilter,
  isSameHolding
} from '@ghostfolio/ui/portfolio-filter-form';
import { DataService } from '@ghostfolio/ui/services';
import { GfTagsSelectorComponent } from '@ghostfolio/ui/tags-selector';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { NavigationStart, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { Big } from 'big.js';
import { format, parseISO } from 'date-fns';
import { addIcons } from 'ionicons';
import {
  albumsOutline,
  cashOutline,
  readerOutline,
  swapVerticalOutline
} from 'ionicons/icons';
import { isNumber } from 'lodash-es';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { filter, finalize, forkJoin } from 'rxjs';

import {
  AccountDetailDialogParams,
  AccountDetailDialogResult
} from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column h-100' },
  imports: [
    GfAccountBalancesComponent,
    GfActivitiesTableComponent,
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    GfHoldingsTableComponent,
    GfInvestmentChartComponent,
    GfTagsSelectorComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule
  ],
  selector: 'gf-account-detail-dialog',
  styleUrls: ['./account-detail-dialog.component.scss'],
  templateUrl: 'account-detail-dialog.html'
})
export class GfAccountDetailDialogComponent implements OnInit {
  protected accountBalances: AccountBalancesResponse['balances'];
  protected activitiesCount: number;
  protected balance: number;
  protected balancePrecision = 2;
  protected currency: string | null;
  protected dataSource: MatTableDataSource<Activity>;
  protected dividendInBaseCurrency: number;
  protected dividendInBaseCurrencyPrecision = 2;
  protected equity: number | null;
  protected equityPrecision = 2;
  protected hasPermissionToDeleteAccountBalance: boolean;
  protected historicalDataItems: LineChartItem[];
  protected readonly holdingFilter = new FormControl<PortfolioPosition | null>(
    null
  );
  protected holdingFilterOptions: PortfolioPosition[] = [];
  protected readonly isSameHolding = isSameHolding;
  protected holdings: PortfolioPosition[];
  protected interestInBaseCurrency: number;
  protected interestInBaseCurrencyPrecision = 2;
  protected isLoading = true;
  protected isLoadingChart: boolean;
  protected readonly isSubmitting = signal(false);
  protected name: string | null;
  protected netPerformancePercentageWithCurrencyEffect: number;
  protected netPerformancePercentageWithCurrencyEffectPrecision = 2;
  protected netPerformanceWithCurrencyEffect: number;
  protected netPerformanceWithCurrencyEffectPrecision = 2;
  protected pageIndex = 0;
  protected pageSize = DEFAULT_PAGE_SIZE;
  protected platformName: string;
  protected sortColumn = 'date';
  protected sortDirection: SortDirection = 'desc';
  protected tags: Tag[];
  protected totalItems: number;
  protected user: User;
  protected valueInBaseCurrency: number;

  protected readonly data = inject<AccountDetailDialogParams>(MAT_DIALOG_DATA);

  private activityTypesFilter: string[] = [];
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef =
    inject<
      MatDialogRef<GfAccountDetailDialogComponent, AccountDetailDialogResult>
    >(MatDialogRef);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public constructor() {
    this.router.events
      .pipe(
        filter((event) => {
          return event instanceof NavigationStart;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.dialogRef.close({ isNavigating: true });
      });

    this.holdingFilter.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex = 0;

        this.fetchActivities();
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToDeleteAccountBalance = hasPermission(
            this.user.permissions,
            permissions.deleteAccountBalance
          );

          this.changeDetectorRef.markForCheck();
        }
      });

    addIcons({
      albumsOutline,
      cashOutline,
      readerOutline,
      swapVerticalOutline
    });
  }

  public ngOnInit() {
    this.initialize();
  }

  protected onAddAccountBalance(accountBalance: CreateAccountBalanceDto) {
    this.isSubmitting.set(true);

    this.dataService
      .postAccountBalance({
        accountBalance,
        accountId: this.data.accountId
      })
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.initialize();

        this.refreshUser();
      });
  }

  protected onChangePage(page: PageEvent) {
    this.pageIndex = page.pageIndex;

    this.fetchActivities();
  }

  protected onClose() {
    this.dialogRef.close();
  }

  protected onDeleteAccountBalance(aId: string) {
    this.dataService
      .deleteAccountBalance({ accountId: this.data.accountId, id: aId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.initialize();

        this.refreshUser();
      });
  }

  protected onExport() {
    const activityIds = this.dataSource.data.map(({ id }) => {
      return id;
    });

    this.dataService
      .fetchExport({ activityIds })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        downloadAsFile({
          content: data,
          fileName: `ghostfolio-export-${this.name
            ?.replace(/\s+/g, '-')
            .toLowerCase()}-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          format: 'json'
        });
      });
  }

  protected onSortChanged({ active, direction }: Sort) {
    this.sortColumn = active;
    this.sortDirection = direction;

    this.fetchActivities();
  }

  protected onTypesFilterChanged(aTypes: string[]) {
    this.activityTypesFilter = aTypes;
    this.pageIndex = 0;

    this.fetchActivities();
  }

  protected showValuesInPercentage() {
    return (
      !hasScope(this.user?.scopes, scopes.portfolioReadValues) ||
      this.user?.settings?.isRestrictedView
    );
  }

  private fetchAccount() {
    this.dataService
      .fetchAccount(this.data.accountId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        ({
          activitiesCount,
          balance,
          currency,
          dividendInBaseCurrency,
          interestInBaseCurrency,
          name,
          platform,
          tags,
          value,
          valueInBaseCurrency
        }) => {
          this.activitiesCount = activitiesCount;
          this.balance = balance;

          if (
            this.balance >= NUMERICAL_PRECISION_THRESHOLD_4_FIGURES &&
            this.data.deviceType === 'mobile'
          ) {
            this.balancePrecision = 0;
          }

          this.currency = currency;
          this.dividendInBaseCurrency = dividendInBaseCurrency;

          if (
            this.data.deviceType === 'mobile' &&
            this.dividendInBaseCurrency >=
              NUMERICAL_PRECISION_THRESHOLD_4_FIGURES
          ) {
            this.dividendInBaseCurrencyPrecision = 0;
          }

          if (isNumber(balance) && isNumber(value)) {
            this.equity = new Big(value).minus(balance).toNumber();

            if (
              this.data.deviceType === 'mobile' &&
              this.equity >= NUMERICAL_PRECISION_THRESHOLD_4_FIGURES
            ) {
              this.equityPrecision = 0;
            }
          } else {
            this.equity = null;
          }

          this.interestInBaseCurrency = interestInBaseCurrency;

          if (
            this.data.deviceType === 'mobile' &&
            this.interestInBaseCurrency >=
              NUMERICAL_PRECISION_THRESHOLD_4_FIGURES
          ) {
            this.interestInBaseCurrencyPrecision = 0;
          }

          this.name = name;
          this.platformName = platform?.name ?? '-';

          this.tags =
            tags?.map((tag) => {
              return {
                ...tag,
                name: translate(tag.name)
              };
            }) ?? [];

          this.valueInBaseCurrency = valueInBaseCurrency;

          this.isLoading = false;

          this.changeDetectorRef.markForCheck();
        }
      );
  }

  private fetchActivities() {
    const filters: Filter[] = [{ id: this.data.accountId, type: 'ACCOUNT' }];
    const holding = this.holdingFilter.value;

    if (holding) {
      filters.push(
        { id: holding.assetProfile.dataSource, type: 'DATA_SOURCE' },
        { id: holding.assetProfile.symbol, type: 'SYMBOL' }
      );
    }

    this.dataService
      .fetchActivities({
        activityTypes: this.activityTypesFilter.length
          ? this.activityTypesFilter
          : undefined,
        filters,
        skip: this.pageIndex * this.pageSize,
        sortColumn: this.sortColumn,
        sortDirection: this.sortDirection,
        take: this.pageSize
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ activities, count }) => {
        this.dataSource = new MatTableDataSource(activities);
        this.totalItems = count;

        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchChart() {
    this.isLoadingChart = true;

    forkJoin({
      accountBalances: this.dataService
        .fetchAccountBalances(this.data.accountId)
        .pipe(takeUntilDestroyed(this.destroyRef)),
      portfolioPerformance: this.dataService
        .fetchPortfolioPerformance({
          filters: [
            {
              id: this.data.accountId,
              type: 'ACCOUNT'
            }
          ],
          range: DEFAULT_DATE_RANGE,
          withExcludedAccounts: true
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
    }).subscribe({
      error: () => {
        this.isLoadingChart = false;

        this.changeDetectorRef.markForCheck();
      },
      next: ({ accountBalances, portfolioPerformance }) => {
        this.accountBalances = accountBalances.balances;

        const {
          netPerformancePercentageWithCurrencyEffect,
          netPerformanceWithCurrencyEffect
        } = portfolioPerformance.performance;

        this.netPerformancePercentageWithCurrencyEffect =
          netPerformancePercentageWithCurrencyEffect;

        if (
          this.data.deviceType === 'mobile' &&
          this.netPerformancePercentageWithCurrencyEffect >=
            NUMERICAL_PRECISION_THRESHOLD_3_FIGURES
        ) {
          this.netPerformancePercentageWithCurrencyEffectPrecision = 0;
        }

        this.netPerformanceWithCurrencyEffect =
          netPerformanceWithCurrencyEffect;

        if (
          this.data.deviceType === 'mobile' &&
          this.netPerformanceWithCurrencyEffect >=
            NUMERICAL_PRECISION_THRESHOLD_4_FIGURES
        ) {
          this.netPerformanceWithCurrencyEffectPrecision = 0;
        }

        if (
          portfolioPerformance.chart &&
          portfolioPerformance.chart.length > 0
        ) {
          this.historicalDataItems = portfolioPerformance.chart
            .map(({ date, netWorth, netWorthInPercentage }) => {
              return {
                date,
                value: isNumber(netWorth) ? netWorth : netWorthInPercentage
              };
            })
            .filter((item): item is LineChartItem => {
              return isNumber(item.value);
            });
        } else {
          this.historicalDataItems = this.accountBalances.map(
            ({ date, valueInBaseCurrency }) => {
              return {
                date: format(date, DATE_FORMAT),
                value: valueInBaseCurrency
              };
            }
          );
        }

        this.isLoadingChart = false;

        this.changeDetectorRef.markForCheck();
      }
    });
  }

  private fetchHoldingFilterOptions() {
    this.dataService
      .fetchPortfolioHoldings({
        filters: [
          {
            id: this.data.accountId,
            type: 'ACCOUNT'
          }
        ]
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ holdings }) => {
        this.holdingFilterOptions = getHoldingsForFilter(holdings);

        this.changeDetectorRef.markForCheck();
      });
  }

  private fetchPortfolioHoldings() {
    this.dataService
      .fetchPortfolioHoldings({
        filters: [
          {
            id: this.data.accountId,
            type: 'ACCOUNT'
          },
          {
            id: 'ACTIVE',
            type: 'HOLDING_TYPE'
          }
        ]
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ holdings }) => {
        this.holdings = holdings;

        this.changeDetectorRef.markForCheck();
      });
  }

  private initialize() {
    this.fetchAccount();
    this.fetchActivities();
    this.fetchChart();
    this.fetchHoldingFilterOptions();
    this.fetchPortfolioHoldings();
  }

  private refreshUser() {
    this.userService
      .get(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
}
