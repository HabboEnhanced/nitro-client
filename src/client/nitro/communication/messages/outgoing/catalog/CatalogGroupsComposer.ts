import { IMessageComposer } from '../../../../../core/communication/messages/IMessageComposer';

export class CatalogGroupsComposer implements IMessageComposer<ConstructorParameters<typeof CatalogGroupsComposer>>
{
    private _data: ConstructorParameters<typeof CatalogGroupsComposer>;

    constructor()
    {
        this._data = [];
    }

    public getMessageArray()
    {
        return this._data;
    }

    public dispose(): void
    {
        return;
    }
}
