import { Component } from '@angular/core';
import { ModtoolUserChatlogParserVisit } from 'nitro-renderer/src/nitro/communication/messages/parser/modtool/utils/ModtoolUserChatlogParserVisit';
import { NavigatorService } from '../../../../navigator/services/navigator.service';
import { ModToolService } from '../../../services/mod-tool.service';
import { ModTool } from '../../tool.component';



@Component({
    template: ''
})
export abstract class ModToolChatlogsComponent extends ModTool
{
    constructor(
        protected _modToolService: ModToolService,
        protected _navigatorService: NavigatorService
    )
    {
        super();
    }

    protected abstract title: string;
    abstract getData(): ModtoolUserChatlogParserVisit[];
    abstract close(): void;


    public goToRoom(roomId: number): void
    {
        this._navigatorService.goToPrivateRoom(roomId);
    }

    public openRoomTools(roomId: number): void
    {
        this._modToolService.openRoomTool(roomId);
    }
}
