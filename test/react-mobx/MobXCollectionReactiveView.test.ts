import { cloneDeep } from 'lodash-es';

import { State } from '@reactive/base/State';
import { MobXCollectionReactiveView } from '@reactive/react-mobx/MobXCollectionReactiveView';

const nextString = (): string => `string_${Math.random().toString(36).slice(2)}`;
const nextNumber = (): number => Math.random();

describe('MobXCollectionReactiveView tests', () => {
    type TestItem = {
        myId: string;
        a: number;
        b: string;
    };

    type TestSourceState = {
        someOtherProp: string;
        myItems: TestItem[];
    };

    type TestState = State<TestSourceState, object>;

    const myItems: TestItem[] = [
        { myId: 'id-1', a: 1, b: 'b-1' },
        { myId: 'id-2', a: 2, b: 'b-2' },
        { myId: 'id-3', a: 3, b: 'b-3' },
    ];
    const defaultSourceState: TestSourceState = cloneDeep({ someOtherProp: 'default', myItems });

    let view: MobXCollectionReactiveView<TestState, { myItems: TestItem }>;

    beforeEach(() => {
        view = new MobXCollectionReactiveView(defaultSourceState, [
            {
                collectionName: 'myItems',
                path: 'myItems',
                idKey: 'myId',
            },
        ]);
    });

    it('should get item', () => {
        //When
        const actual = view.getItem('myItems', myItems[1].myId);

        //Then
        expect(actual).toEqual(myItems[1]);
    });

    it('should get item as null when not found', () => {
        //When
        const actual = view.getItem('myItems', nextString());

        //Then
        expect(actual).toBeNull();
    });

    it('should delete item', () => {
        //When
        view.deleteItem('myItems', myItems[1].myId);

        //Then
        expect(view.state.myItems).toEqual([myItems[0], myItems[2]]);
    });

    it('should not delete item when not found', () => {
        //When
        view.deleteItem('myItems', nextString());

        //Then
        expect(view.state.myItems).toEqual(myItems);
    });

    it('should push new item', () => {
        //Given
        const newItem: TestItem = {
            myId: nextString(),
            a: nextNumber(),
            b: nextString(),
        };
        const expected = [...myItems, newItem];

        //When
        view.pushItem('myItems', newItem);

        //Then
        expect(view.state.myItems).toEqual(expected);
    });
});
