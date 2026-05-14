import { ReactiveView } from './ReactiveView';
import { State } from './State';

export interface CollectionsReactiveView<
    FullState extends State<object, object>,
    CollectionsList extends Record<string, object>,
> extends ReactiveView<FullState> {
    getItem<
        Collection extends keyof CollectionsList,
        Item extends CollectionsList[Collection],
        Id extends keyof Item = 'id' extends keyof Item ? 'id' : never,
    >(
        collection: Collection,
        id: Item[Id],
    ): Item | null;
    pushItem<Collection extends keyof CollectionsList, Item extends CollectionsList[Collection]>(
        collection: Collection,
        item: Item,
    ): void;
    deleteItem<
        Collection extends keyof CollectionsList,
        Item extends CollectionsList[Collection],
        Id extends keyof Item = 'id' extends keyof Item ? 'id' : never,
    >(
        collection: Collection,
        id: Item[Id],
    ): void;
    updateItem<
        Collection extends keyof CollectionsList,
        Item extends CollectionsList[Collection],
        Id extends keyof Item = 'id' extends keyof Item ? 'id' : never,
    >(
        collection: Collection,
        id: Item[Id],
        toUpdate: Partial<Item>,
    ): void;
    clear<Collection extends keyof CollectionsList>(collection: Collection): void;
}
