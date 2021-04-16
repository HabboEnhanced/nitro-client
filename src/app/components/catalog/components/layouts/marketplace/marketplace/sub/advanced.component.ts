import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Nitro } from '../../../../../../../../client/nitro/Nitro';

@Component({
    template: `
        <div>
            <div class="row mb-1">
                <div class="col-6">
                    <input type="text" class="form-control form-control-sm mb-1" [(ngModel)]="searchQuery" [placeholder]="'catalog.marketplace.search_name' | translate" />
                </div>
                <div class="col-6">
                    <div class="mt-2">{{ 'catalog.marketplace.search_price' | translate }}</div>
                </div>
            </div>
            <div class="row mb-2">
                <div class="col-6">
                    <select class="form-control form-control-sm w-100" (change)="onOptionSelect($event)">
                        <option [selected]="filter.value == sortType" [value]="filter.value" *ngFor="let filter of getFilters()">{{ filter.name }}</option>
                    </select>
                </div>
                <div class="col-6">
                    <div class="input-group">
                        <input type="number" placeholder="0" class="form-control form-control-sm mb-1" [(ngModel)]="searchPriceBetweenStart" />
                        <input type="number" placeholder="0" class="form-control form-control-sm" [(ngModel)]="searchPriceBetweenEnd" />
                    </div>
                </div>
            </div>
            <button (click)="search()" class="btn btn-secondary btn-block btn-sm">{{ 'search' | translate }}</button>
        </div>
        `,
    selector: '[nitro-marketplace-sub-advanced]',
})
export class CatalogLayoutMarketplaceMarketplaceSubAdvancedComponent
{
    @Input()
    public sortTypes: number[];


    @Output()
    public sortChanged = new EventEmitter<number>();

    public sortType: number = 0;

    public searchQuery: string = '';
    public searchPriceBetweenStart: number = null;
    public searchPriceBetweenEnd: number = null;

    public getFilters(): IFilter[]
    {
        const filters = [];

        for(const type of this.sortTypes)
        {
            const name = this.translateKey(`catalog.marketplace.sort.${type}`);
            filters.push({
                name,
                value: type
            });
        }

        return filters;
    }

    public ngOnInit(): void
    {
        this.sortType = this.sortTypes[0];
        //this.sortChanged.emit(this.sortType);
    }

    private translateKey(key: string): string
    {
        return Nitro.instance.localization.getValue(key);
    }

    public onOptionSelect(event)
    {
        const value = parseInt(event.target.value);
        this.sortType = value;
        this.sortChanged.emit(value);
    }

    public search(): void
    {

    }

}



interface IFilter {
    name: string,
    value: number
}
