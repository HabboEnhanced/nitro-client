import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { IMessageEvent } from '../../../../client/core/communication/messages/IMessageEvent';
import { FurnitureListAddOrUpdateEvent } from '../../../../client/nitro/communication/messages/incoming/inventory/furni/FurnitureListAddOrUpdateEvent';
import { FurnitureListEvent } from '../../../../client/nitro/communication/messages/incoming/inventory/furni/FurnitureListEvent';
import { FurnitureListInvalidateEvent } from '../../../../client/nitro/communication/messages/incoming/inventory/furni/FurnitureListInvalidateEvent';
import { FurnitureListRemovedEvent } from '../../../../client/nitro/communication/messages/incoming/inventory/furni/FurnitureListRemovedEvent';
import { FurniturePostItPlacedEvent } from '../../../../client/nitro/communication/messages/incoming/inventory/furni/FurniturePostItPlacedEvent';
import { FurnitureListComposer } from '../../../../client/nitro/communication/messages/outgoing/inventory/furni/FurnitureListComposer';
import { FurniturePlacePaintComposer } from '../../../../client/nitro/communication/messages/outgoing/room/furniture/FurniturePlacePaintComposer';
import { FurnitureListItemParser } from '../../../../client/nitro/communication/messages/parser/inventory/furniture/utils/FurnitureListItemParser';
import { Nitro } from '../../../../client/nitro/Nitro';
import { RoomObjectPlacementSource } from '../../../../client/nitro/room/enums/RoomObjectPlacementSource';
import { RoomEngineObjectEvent } from '../../../../client/nitro/room/events/RoomEngineObjectEvent';
import { RoomEngineObjectPlacedEvent } from '../../../../client/nitro/room/events/RoomEngineObjectPlacedEvent';
import { IObjectData } from '../../../../client/nitro/room/object/data/IObjectData';
import { RoomObjectCategory } from '../../../../client/nitro/room/object/RoomObjectCategory';
import { InventoryMainComponent } from '../components/main/main.component';
import { FurniCategory } from '../items/FurniCategory';
import { FurnitureItem } from '../items/FurnitureItem';
import { GroupItem } from '../items/GroupItem';
import { IFurnitureItem } from '../items/IFurnitureItem';
import { UnseenItemCategory } from '../unseen/UnseenItemCategory';
import { InventoryService } from './inventory.service';
import { GetBotInventoryComposer } from '../../../../client/nitro/communication/messages/outgoing/inventory/bots/GetBotInventoryComposer';
import { BotInventoryMessageEvent } from '../../../../client/nitro/communication/messages/incoming/inventory/bots/BotInventoryMessageEvent';
import { BotData } from '../../../../client/nitro/communication/messages/parser/inventory/bots/BotData';
import { AdvancedMap } from '../../../../client/core/utils/AdvancedMap';
import { RoomObjectType } from '../../../../client/nitro/room/object/RoomObjectType';
import { BotRemovedFromInventoryEvent } from '../../../../client/nitro/communication/messages/incoming/inventory/bots/BotRemovedFromInventoryEvent';
import { BotAddedToInventoryEvent } from '../../../../client/nitro/communication/messages/incoming/inventory/bots/BotAddedToInventoryEvent';
import { RequestBadgesComposer } from '../../../../client/nitro/communication/messages/outgoing/inventory/badges/RequestBadgesComposer';
import { _Str_5147 } from '../../../../client/nitro/communication/messages/incoming/inventory/badges/_Str_5147';
import { Badge } from '../models/badge';
import { isWarningEnabled } from '@angular/cli/utilities/config';

@Injectable()
export class InventoryFurnitureService implements OnDestroy
{
    public static INVENTORY_UPDATED: string             = 'IFS_INVENTORY_UPDATED';
    public static SELECT_FIRST_GROUP: string            = 'IFS_SELECT_FIRST_GROUP';
    public static SELECT_EXISTING_GROUP_DEFAULT: string = 'IFS_SELECT_EXISTING_GROUP_DEFAULT';

    private _messages: IMessageEvent[]                                  = [];
    private _furniMsgFragments: Map<number, FurnitureListItemParser>[]  = null;
    private _botsFragments: AdvancedMap<number, BotData>                = null;
    private _groupItems: GroupItem[]                                    = [];
    private _itemIdInFurniPlacing: number                               = -1;
    private _isObjectMoverRequested: boolean                            = false;
    private _isInitialized: boolean                                     = false;
    private _needsUpdate: boolean                                       = false;

    constructor(
        private _inventoryService: InventoryService,
        private _ngZone: NgZone)
    {
        this.onRoomEngineObjectPlacedEvent = this.onRoomEngineObjectPlacedEvent.bind(this);

        this.registerMessages();
    }

    public ngOnDestroy(): void
    {
        this.unregisterMessages();
    }

    private registerMessages(): void
    {
        this._ngZone.runOutsideAngular(() =>
        {
            Nitro.instance.roomEngine.events.addEventListener(RoomEngineObjectEvent.PLACED, this.onRoomEngineObjectPlacedEvent);

            this._messages = [
                new FurnitureListAddOrUpdateEvent(this.onFurnitureListAddOrUpdateEvent.bind(this)),
                new FurnitureListEvent(this.onFurnitureListEvent.bind(this)),
                new FurnitureListInvalidateEvent(this.onFurnitureListInvalidateEvent.bind(this)),
                new FurnitureListRemovedEvent(this.onFurnitureListRemovedEvent.bind(this)),
                new FurniturePostItPlacedEvent(this.onFurniturePostItPlacedEvent.bind(this)),
                new BotInventoryMessageEvent(this.onBotInventoryMessageEvent.bind(this)),
                new BotRemovedFromInventoryEvent(this.onBotRemovedFromInventoryEvent.bind(this)),
                new BotAddedToInventoryEvent(this.onBotAddedToInventoryEvent.bind(this)),
                new _Str_5147(this.onBadgesListEvent.bind(this)),
            ];

            for(const message of this._messages) Nitro.instance.communication.registerMessageEvent(message);
        });
    }

    public unregisterMessages(): void
    {
        this._ngZone.runOutsideAngular(() =>
        {
            Nitro.instance.roomEngine.events.removeEventListener(RoomEngineObjectEvent.PLACED, this.onRoomEngineObjectPlacedEvent);

            for(const message of this._messages) Nitro.instance.communication.removeMessageEvent(message);

            this._messages = [];
        });
    }

    private onRoomEngineObjectPlacedEvent(event: RoomEngineObjectPlacedEvent): void
    {
        if(!event) return;

        if(this._isObjectMoverRequested && event.type === RoomEngineObjectEvent.PLACED)
        {
            this._isObjectMoverRequested = false;

            if(!event._Str_4057)
            {
                this._ngZone.run(() => this._inventoryService.showWindow());
            }
        }
    }

    private onFurnitureListAddOrUpdateEvent(event: FurnitureListAddOrUpdateEvent): void
    {
        if(!event) return;

        const parser = event.getParser();

        if(!parser) return;

        const items = parser.items;

        this._ngZone.run(() =>
        {
            for(const item of items)
            {
                const groupItem = this.getGroupItemForFurnitureId(item.itemId);

                if(groupItem)
                {
                    const furnitureItem = groupItem.getItemById(item.itemId);

                    if(furnitureItem)
                    {
                        furnitureItem.update(item);

                        groupItem.hasUnseenItems = true;
                    }
                }
                else
                {
                    const furnitureItem = new FurnitureItem(item);

                    this.addFurnitureItem(furnitureItem, false);
                }
            }
        });
    }

    private onFurnitureListEvent(event: FurnitureListEvent): void
    {
        if(!event) return;

        const parser = event.getParser();

        if(!parser) return;

        if(!this._furniMsgFragments) this._furniMsgFragments = new Array(parser.totalFragments);

        const map       = new Map([ ...parser.fragment ]);
        const merged    = this.mergeFragments(map, parser.totalFragments, parser.fragmentNumber, this._furniMsgFragments);

        if(!merged) return;

        this._ngZone.run(() => this.processFragment(merged));

        this._furniMsgFragments = null;
    }

    private onBotInventoryMessageEvent(event: BotInventoryMessageEvent): void
    {
        if(!event) return;

        const parser = event.getParser();

        if(!parser) return;

        this._botsFragments = parser.items;

    }

    private onBotRemovedFromInventoryEvent(event: BotRemovedFromInventoryEvent): void
    {
        if(!event) return;

        const parser = event.getParser();

        if(!parser) return;

        if(!this._botsFragments) return;

        this._ngZone.run(() => this._botsFragments.remove(parser.itemId));

    }

    private onBadgesListEvent(event: _Str_5147): void
    {
        if(!event) return;

        const parser = event.getParser();

        if(!parser) return;

        const local6 = parser._Str_21415();
        const local7 = parser._Str_23681();
        for(const badgeId of local6)
        {
            const isWearingBadge = local7.indexOf(badgeId) > -1;
            const local9 = parser._Str_17775(badgeId);
            this.updateBadge(badgeId, isWearingBadge, local9);
        }
    }


    private _badgeIds: AdvancedMap<string, number> = new AdvancedMap<string, number>();

    public get badgeIds(): AdvancedMap<string, number>
    {
        return this._badgeIds;
    }
    private _badges: Badge[] = [];
    private _badgesInUse: Badge[] = [];
    private updateBadge(k: string, arg2: boolean, arg3: number = 0): void
    {
        if(arg3 > 0)
        {
            this._badgeIds.add(k, arg3);
        }

        const local4 = this._Str_19103(k);
        if(local4 != null)
        {
            if(local4._Str_3222 != arg2)
            {
                this._Str_17363(local4);
            }
            else
            {
                this._Str_16521(local4);
            }
        }
        else
        {
            //

        }
    }

    private _Str_16521(k: Badge): void
    {
        let local2 = 0;
        while(local2 < this._badgesInUse.length)
        {
            if(this._badgesInUse[local2] == k)
            {
                this._badgesInUse.splice(local2, 1);
                k._Str_3222 = false;
                return;
            }
            local2++;
        }
    }

    private _Str_17363(k: Badge): void
    {
        this._badgesInUse.push(k);
        k._Str_3222 = true;
    }

    // get badge by name
    private _Str_19103(k: string)
    {
        for(const badge of this._badges)
        {
            if(badge.badgeId === k) return badge;
        }

        return null;
    }

    private onBotAddedToInventoryEvent(event: BotAddedToInventoryEvent): void
    {
        if(!event) return;

        const parser = event.getParser();

        if(!parser) return;

        if(!this._botsFragments) this._botsFragments = new AdvancedMap<number, BotData>();

        this._ngZone.run(() => this._botsFragments.add(parser.item.id, parser.item));

    }


    private onFurnitureListInvalidateEvent(event: FurnitureListInvalidateEvent): void
    {
        if(!event) return;

        const parser = event.getParser();

        if(!parser) return;

        if(this._inventoryService.furnitureVisible)
        {
            this.requestLoad();

            return;
        }

        this._needsUpdate = true;
    }

    private onFurnitureListRemovedEvent(event: FurnitureListRemovedEvent): void
    {
        if(!event) return;

        const parser = event.getParser();

        if(!parser) return;

        this._ngZone.run(() =>
        {
            const groupItem = this.removeItemById(parser.itemId);

            if(groupItem) this.setAllFurnitureSeen();
        });
    }

    private onFurniturePostItPlacedEvent(event: FurniturePostItPlacedEvent): void
    {
        if(!event) return;

        const parser = event.getParser();

        if(!parser) return;
    }

    private mergeFragments(fragment: Map<number, FurnitureListItemParser>, totalFragments: number, fragmentNumber: number, fragments: Map<number, FurnitureListItemParser>[]): Map<number, FurnitureListItemParser>
    {
        if(totalFragments === 1) return fragment;

        fragments[fragmentNumber] = fragment;

        for(const frag of fragments)
        {
            if(!frag) return null;
        }

        const mergedFragment: Map<number, FurnitureListItemParser> = new Map();

        for(const frag of fragments)
        {
            for(const [ key, value ] of frag) mergedFragment.set(key, value);

            frag.clear();
        }

        fragments = null;

        return mergedFragment;
    }

    private processFragment(fragment: Map<number, FurnitureListItemParser>): void
    {
        const existingSet           = this.getAllItemIds();
        const addedSet: number[]    = [];
        const removedSet: number[]  = [];

        for(const key of fragment.keys())
        {
            if(existingSet.indexOf(key) === -1) addedSet.push(key);
        }

        for(const itemId of existingSet)
        {
            if(!fragment.get(itemId)) removedSet.push(itemId);
        }

        const emptyExistingSet = (existingSet.length === 0);

        for(const itemId of removedSet)
        {
            this.removeItemById(itemId);
        }

        for(const itemId of addedSet)
        {
            const parser = fragment.get(itemId);

            if(!parser) continue;

            const item = new FurnitureItem(parser);

            this.addFurnitureItem(item, true);
        }

        if(!emptyExistingSet)
        {
            if(addedSet.length) this._inventoryService.updateItemLocking();
        }

        if(addedSet.length && this._inventoryService.furniController) this._inventoryService.furniController.paginateConfig.currentPage = 1;

        this._isInitialized = true;

        this._inventoryService.events.next(InventoryFurnitureService.INVENTORY_UPDATED);

        if(this._inventoryService.furniController) this._inventoryService.furniController.selectExistingGroupOrDefault();
    }

    private getAllItemIds(): number[]
    {
        const itemIds: number[] = [];

        for(const groupItem of this._groupItems)
        {
            let totalCount = groupItem.getTotalCount();

            if(groupItem.category === FurniCategory._Str_12351) totalCount = 1;

            let i = 0;

            while(i < totalCount)
            {
                itemIds.push(groupItem.getItemByIndex(i).id);

                i++;
            }
        }

        return itemIds;
    }

    public getFurnitureItem(id: number): IFurnitureItem
    {
        for(const furniture of this._groupItems)
        {
            if(!furniture) continue;

            const item = furniture.getItemById(id);

            if(item) return item;
        }

        return null;
    }

    private addFurnitureItem(item: FurnitureItem, flag: boolean): void
    {
        let groupItem: GroupItem = null;

        if(!item.isGroupable)
        {
            groupItem = this.addSingleFurnitureItem(item, flag);
        }
        else
        {
            groupItem = this.addGroupableFurnitureItem(item, flag);
        }

        if(!flag) groupItem.hasUnseenItems = true;
    }

    private addSingleFurnitureItem(item: FurnitureItem, flag: boolean): GroupItem
    {
        const groupItems: GroupItem[] = [];

        for(const groupItem of this._groupItems)
        {
            if(groupItem.type === item.type) groupItems.push(groupItem);
        }

        for(const groupItem of groupItems)
        {
            if(groupItem.getItemById(item.id)) return groupItem;
        }

        const unseen    = this.isFurnitureUnseen(item);
        const groupItem = this.createGroupItem(item.type, item.category, item.stuffData, item.extra, flag);

        groupItem.push(item, unseen);

        if(unseen)
        {
            groupItem.hasUnseenItems = true;

            this.unshiftGroupitem(groupItem);
        }
        else
        {
            this.pushGroupItem(groupItem);
        }

        return groupItem;
    }

    private addGroupableFurnitureItem(item: FurnitureItem, flag: boolean): GroupItem
    {
        let existingGroup: GroupItem = null;

        for(const groupItem of this._groupItems)
        {
            if((groupItem.type === item.type) && (groupItem.isWallItem == item.isWallItem) && groupItem.isGroupable)
            {
                if(item.category === FurniCategory._Str_5186)
                {
                    if(groupItem.stuffData.getLegacyString() === item.stuffData.getLegacyString())
                    {
                        existingGroup = groupItem;

                        break;
                    }
                }

                else if(item.category === FurniCategory._Str_12454)
                {
                    if(item.stuffData.compare(groupItem.stuffData))
                    {
                        existingGroup = groupItem;

                        break;
                    }
                }

                else
                {
                    existingGroup = groupItem;

                    break;
                }
            }
        }

        const unseen = this.isFurnitureUnseen(item);

        if(existingGroup)
        {
            existingGroup.push(item, unseen);

            if(unseen)
            {
                existingGroup.hasUnseenItems = true;

                this.removeAndUnshiftGroupitem(existingGroup);
            }

            return existingGroup;
        }

        existingGroup = this.createGroupItem(item.type, item.category, item.stuffData, item.extra, flag);

        existingGroup.push(item, unseen);

        if(unseen)
        {
            existingGroup.hasUnseenItems = true;

            this.unshiftGroupitem(existingGroup);
        }
        else
        {
            this.pushGroupItem(existingGroup);
        }

        return existingGroup;
    }

    public createGroupItem(type: number, category: number, stuffData: IObjectData, extra: number = NaN, flag: boolean = false): GroupItem
    {
        // const iconImage: HTMLImageElement = null;

        if(category === FurniCategory._Str_3639)
        {
            // const icon = this._windowManager.assets.getAssetByName("inventory_furni_icon_wallpaper");
            // if (icon != null)
            // {
            //     iconImage = (icon.content as BitmapData).clone();
            // }
        }

        else if(category === FurniCategory._Str_3683)
        {
            // const icon = this._windowManager.assets.getAssetByName("inventory_furni_icon_floor");
            // if (icon != null)
            // {
            //     iconImage = (icon.content as BitmapData).clone();
            // }
        }

        else if(category === FurniCategory._Str_3432)
        {
            // const icon = this._windowManager.assets.getAssetByName("inventory_furni_icon_landscape");
            // if (icon != null)
            // {
            //     iconImage = (icon.content as BitmapData).clone();
            // }
        }

        return new GroupItem(type, category, Nitro.instance.roomEngine, stuffData, extra);
    }

    public removeItemById(id: number): GroupItem
    {
        let i = 0;

        while(i < this._groupItems.length)
        {
            const groupItem = this._groupItems[i];
            const item      = groupItem.remove(id);

            if(item)
            {
                if(this._itemIdInFurniPlacing === item.ref)
                {
                    this.cancelRoomObjectPlacement();

                    if(!this.attemptItemPlacement())
                    {
                        //this._events.next(InventoryFurnitureService.SELECT_EXISTING_GROUP_DEFAULT);

                        this._inventoryService.showWindow();
                    }
                }

                if(groupItem.getTotalCount() <= 0)
                {
                    this._groupItems.splice(i, 1);

                    // if(groupItem.selected)
                    // {
                    //     this._events.next(InventoryFurnitureService.SELECT_FIRST_GROUP);
                    // }

                    groupItem.dispose();
                }

                return groupItem;
            }

            i++;
        }

        return null;
    }

    private isFurnitureUnseen(item: FurnitureItem): boolean
    {
        let category = 0;

        if(item.rentable) category = UnseenItemCategory.RENTABLE;
        else category = UnseenItemCategory.FURNI;

        return this._inventoryService.unseenTracker._Str_3613(category, item.id);
    }

    public setAllFurnitureSeen(): void
    {
        this._inventoryService.unseenTracker._Str_8813(UnseenItemCategory.FURNI);

        for(const groupItem of this._groupItems)
        {
            if(groupItem.hasUnseenItems) groupItem.hasUnseenItems = false;
        }

        this._inventoryService.updateUnseenCount();
    }

    public attemptItemPlacement(flag: boolean = false): boolean
    {
        const groupItem = this.getSelectedGroup();

        if(!groupItem) return false;

        if(!groupItem.getUnlockedCount()) return false;

        const item = groupItem.getLastItem();

        if(!item) return false;

        if((item.category === FurniCategory._Str_3683) || (item.category === FurniCategory._Str_3639) || (item.category === FurniCategory._Str_3432))
        {
            if(flag) return false;

            Nitro.instance.communication.connection.send(new FurniturePlacePaintComposer(item.id));
        }
        else
        {
            this._inventoryService.hideWindow();

            this.startRoomObjectPlacement(item);
        }

        return true;
    }

    public attemptBotPlacement(bot: BotData, flag: boolean = false): boolean
    {

        if(!bot) return false;


        this._inventoryService.hideWindow();

        const session = Nitro.instance.roomSessionManager.getSession(1);

        if(!session) return false;
        if(!session.isRoomOwner) return false;

        const negativeBotId = (bot.id * -1);

        return Nitro.instance.roomEngine.processRoomObjectPlacement(RoomObjectPlacementSource.INVENTORY, negativeBotId, RoomObjectCategory.UNIT, RoomObjectType.RENTABLE_BOT, bot.figure);
    }

    public startRoomObjectPlacementWithoutRequest(item: IFurnitureItem): boolean
    {
        let category    = 0;
        let isMoving    = false;

        if(item.isWallItem) category = RoomObjectCategory.WALL;
        else category = RoomObjectCategory.FLOOR;

        if((item.category === FurniCategory._Str_5186))
        {
            isMoving = Nitro.instance.roomEngine.processRoomObjectPlacement(RoomObjectPlacementSource.INVENTORY, item.id, category, item.type, item.stuffData.getLegacyString());
        }
        else
        {
            isMoving = Nitro.instance.roomEngine.processRoomObjectPlacement(RoomObjectPlacementSource.INVENTORY, item.id, category, item.type, item.extra.toString(), item.stuffData);
        }

        return isMoving;
    }

    private startRoomObjectPlacement(item: FurnitureItem): void
    {
        let category    = 0;
        let isMoving    = false;

        if(item.isWallItem) category = RoomObjectCategory.WALL;
        else category = RoomObjectCategory.FLOOR;

        if((item.category === FurniCategory._Str_5186)) // or external image from furnidata
        {
            isMoving = Nitro.instance.roomEngine.processRoomObjectPlacement(RoomObjectPlacementSource.INVENTORY, item.id, category, item.type, item.stuffData.getLegacyString());
        }
        else
        {
            isMoving = Nitro.instance.roomEngine.processRoomObjectPlacement(RoomObjectPlacementSource.INVENTORY, item.id, category, item.type, item.extra.toString(), item.stuffData);
        }

        if(isMoving)
        {
            this._itemIdInFurniPlacing = item.ref;

            this.setObjectMoverRequested(true);
        }
    }

    private cancelRoomObjectPlacement(): void
    {
        if(this._itemIdInFurniPlacing > -1)
        {
            Nitro.instance.roomEngine.cancelRoomObjectPlacement();

            this.setObjectMoverRequested(false);

            this._itemIdInFurniPlacing = -1;
        }
    }

    public getGroupItemForFurnitureId(id: number): GroupItem
    {
        for(const groupItem of this._groupItems)
        {
            const item = groupItem.getItemById(id);

            if(item) return groupItem;
        }

        return null;
    }

    public getSelectedGroup(): GroupItem
    {
        for(const groupItem of this._groupItems)
        {
            if(groupItem && groupItem.selected) return groupItem;
        }

        return null;
    }

    private unshiftGroupitem(groupItem: GroupItem): void
    {
        this._groupItems.unshift(groupItem);
    }

    private pushGroupItem(groupItem: GroupItem): void
    {
        this._groupItems.push(groupItem);
    }

    private removeGroupItem(k: GroupItem): void
    {
        const index = this._groupItems.indexOf(k);

        if(index > -1) this._groupItems.splice(index, 1);
    }

    private removeAndUnshiftGroupitem(k: GroupItem): void
    {
        this.removeGroupItem(k);
        this.unshiftGroupitem(k);
    }

    public unlockAllItems(): void
    {
        for(const item of this._groupItems)
        {
            item.unlockAllItems();
        }
    }

    public unselectAllGroupItems(): void
    {
        for(const groupItem of this._groupItems) groupItem.selected = false;
    }

    public requestLoad(): void
    {
        this._needsUpdate = false;

        Nitro.instance.communication.connection.send(new FurnitureListComposer());
        Nitro.instance.communication.connection.send(new GetBotInventoryComposer());
        Nitro.instance.communication.connection.send(new RequestBadgesComposer());
    }

    private setObjectMoverRequested(flag: boolean)
    {
        if(this._isObjectMoverRequested === flag) return;

        this._ngZone.run(() => (this._isObjectMoverRequested = flag));
    }

    public get controller(): InventoryMainComponent
    {
        return this._inventoryService.controller;
    }

    public get isInitalized(): boolean
    {
        return this._isInitialized;
    }

    public get needsUpdate(): boolean
    {
        return this._needsUpdate;
    }

    public get groupItems(): GroupItem[]
    {
        return this._groupItems;
    }

    public get isObjectMoverRequested(): boolean
    {
        return this._isObjectMoverRequested;
    }

    public getBots(): AdvancedMap<number, BotData>
    {
        return this._botsFragments;
    }
}
