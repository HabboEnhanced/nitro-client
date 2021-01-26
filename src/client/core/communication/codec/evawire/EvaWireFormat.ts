import { IConnection } from '../../connections/IConnection';
import { IMessageDataWrapper } from '../../messages/IMessageDataWrapper';
import { BinaryReader } from '../BinaryReader';
import { BinaryWriter } from '../BinaryWriter';
import { Byte } from '../Byte';
import { ICodec } from '../ICodec';
import { Short } from '../Short';
import { EvaWireDataWrapper } from './EvaWireDataWrapper';

export class EvaWireFormat implements ICodec
{
    public encode(header: number, messages: any[]): BinaryWriter
    {
        const writer = new BinaryWriter();

        writer.writeShort(header);

        for(const value of messages)
        {
            let type: string = typeof value;

            if(type === 'object')
            {
                if(value === null)              type = 'null';
                else if(value instanceof Byte)  type = 'byte';
                else if(value instanceof Short) type = 'short';
            }

            switch(type)
            {
                case 'null':
                    writer.writeShort(0);
                    break;
                case 'byte':
                    writer.writeByte(value.value);
                    break;
                case 'short':
                    writer.writeShort(value.value);
                    break;
                case 'number':
                    writer.writeInt(value);
                    break;
                case 'boolean':
                    writer.writeByte(value ? 1 : 0);
                    break;
                case 'string':
                    if(!value) writer.writeShort(0);
                    else
                    {
                        writer.writeString(value, true);
                    }
                    break;
            }
        }

        const buffer = writer.getBuffer();

        if(!buffer) return null;

        return new BinaryWriter().writeInt(buffer.byteLength).writeBytes(buffer);
    }

    public decode(connection: IConnection): IMessageDataWrapper[]
    {
        if(!connection || !connection.dataBuffer || !connection.dataBuffer.byteLength) return null;

        const wrappers: IMessageDataWrapper[] = [];

        while(connection.dataBuffer.byteLength)
        {
            if(connection.dataBuffer.byteLength < 4) break;

            const container = new BinaryReader(connection.dataBuffer);
            const length    = container.readInt();

            if(length > (connection.dataBuffer.byteLength - 4)) break;

            const extracted = container.readBytes(length);

            wrappers.push(new EvaWireDataWrapper(extracted.readShort(), extracted));

            connection.dataBuffer = connection.dataBuffer.slice(length + 4);
        }

        return wrappers;
    }
}