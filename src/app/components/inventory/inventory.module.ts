import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared';
import { InventoryBotsComponent } from './components/bots/bots.component';
import { InventoryFurnitureComponent } from './components/furniture/furniture.component';
import { InventoryMainComponent } from './components/main/main.component';
import { InventoryPetsComponent } from './components/pets/pets.component';
import { InventoryTradingComponent } from './components/trading/trading.component';
import { InventoryFurnitureService } from './services/furniture.service';
import { InventoryService } from './services/inventory.service';
import { InventoryTradingService } from './services/trading.service';
import { InventoryBadgesComponent } from './components/badges/badges.component';
import { InventoryBadgeService } from './services/badge.service';

@NgModule({
    imports: [
        SharedModule
    ],
    exports: [
        InventoryBotsComponent,
        InventoryBadgesComponent,
        InventoryFurnitureComponent,
        InventoryMainComponent,
        InventoryPetsComponent,
        InventoryTradingComponent
    ],
    providers: [
        InventoryService,
        InventoryFurnitureService,
        InventoryTradingService,
        InventoryBadgeService
    ],
    declarations: [
        InventoryBotsComponent,
        InventoryBadgesComponent,
        InventoryFurnitureComponent,
        InventoryMainComponent,
        InventoryPetsComponent,
        InventoryTradingComponent
    ]
})
export class InventoryModule
{}
