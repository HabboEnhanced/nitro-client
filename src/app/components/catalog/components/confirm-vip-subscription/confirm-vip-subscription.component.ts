import { Component, ElementRef, Input, NgZone, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CatalogClubOfferData } from '../../../../../client/nitro/communication/messages/parser/catalog/utils/CatalogClubOfferData';
import { ToolbarIconEnum } from '../../../../../client/nitro/enums/ToolbarIconEnum';
import { NitroToolbarAnimateIconEvent } from '../../../../../client/nitro/events/NitroToolbarAnimateIconEvent';
import { Nitro } from '../../../../../client/nitro/Nitro';
import { TextureUtils } from '../../../../../client/room/utils/TextureUtils';
import { CatalogService } from '../../services/catalog.service';
import {CatalogPurchaseComposer} from "../../../../../client/nitro/communication/messages/outgoing/catalog/CatalogPurchaseComposer";
@Component({
    selector: 'nitro-catalog-confirm-vip-subscription-component',
    templateUrl: './confirm-vip-subscription.template.html'
})
export class CatalogConfirmVipSubscriptionComponent
{
    @Input()
    public subscription: CatalogClubOfferData = null;


    constructor(
        private _catalogService: CatalogService,
        private _ngZone: NgZone
    )
    {}


    public getSubscriptionText(): string
    {
        let text = Nitro.instance.localization.getValue('catalog.vip.buy.confirm.end_date');
        text = text.replace('%month%', this.subscription.month.toString());
        text = text.replace('%day%', this.subscription.day.toString());
        text = text.replace('%year%', this.subscription.year.toString());
        return text;
    }

    public getSubscriptionHeader(): string
    {
        const purse = this._catalogService.purse;

        const extensionOrSubscription = (purse.clubDays > 0 || purse.clubPeriods > 0) ? 'extension.' : 'subscription.';

        const daysOrMonths  = this.subscription.months == 0 ? 'days' : 'months';

        const local5 = 'catalog.vip.buy.confirm.' +extensionOrSubscription + daysOrMonths;

        const text = Nitro.instance.localization.getValue(local5);

        const daysOrMonthsText = this.subscription.months == 0 ? this.subscription.extraDays : this.subscription.months;

        return text.replace('%NUM_' + daysOrMonths.toUpperCase() + '%', daysOrMonthsText.toString());
    }

    public getCurrencyUrl(type: number): string
    {
        const url = Nitro.instance.getConfiguration<string>('currency.asset.icon.url');

        return url.replace('%type%', type.toString());
    }

    public hide(): void
    {
        (this._catalogService.component && this._catalogService.component.hidePurchaseConfirmation());
    }

    public purchase(): void
    {
        this._catalogService.purchaseById(this._catalogService.activePage.pageId, this.subscription.offerId, 1);
    }


}
