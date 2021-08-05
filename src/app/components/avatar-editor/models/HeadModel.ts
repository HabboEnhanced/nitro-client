import { AvatarEditorFigureCategory } from '@nitrots/nitro-renderer/src/nitro/avatar/enum/AvatarEditorFigureCategory';
import { CategoryBaseModel } from '../common/CategoryBaseModel';
import { FigureData } from '../common/FigureData';

export class HeadModel extends CategoryBaseModel
{
    public init(): void
    {
        super.init();

        this.addCategory(FigureData.HAIR);
        this.addCategory(FigureData.HAT);
        this.addCategory(FigureData.HEAD_ACCESSORIES);
        this.addCategory(FigureData.EYE_ACCESSORIES);
        this.addCategory(FigureData.FACE_ACCESSORIES);

        this._isInitalized = true;
    }

    public get name(): string
    {
        return AvatarEditorFigureCategory.HEAD;
    }
}
