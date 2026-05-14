import { get } from 'lodash-es';
import { action, makeObservable } from 'mobx';

import { mergeState } from './mergeState';
import { MobXReactiveView } from './MobXReactiveView';
import { CollectionsReactiveView } from '../base/CollectionsReactiveView';
import { SourceOf, State } from '../base/State';

type CollectionSettings<CollectionsList extends Record<string, object>, Collection extends keyof CollectionsList> = {
    collectionName: Collection;
    path: string;
    idKey: keyof CollectionsList[Collection];
};

export class MobXCollectionReactiveView<
    FullState extends State<object, object>,
    CollectionsList extends Record<string, object>,
>
    extends MobXReactiveView<FullState>
    implements CollectionsReactiveView<FullState, CollectionsList>
{
    private collectionsMap: Map<keyof CollectionsList, CollectionSettings<CollectionsList, keyof CollectionsList>>;

    constructor(
        defaultSourceState: Required<SourceOf<FullState>>,
        collections: CollectionSettings<CollectionsList, keyof CollectionsList>[],
    ) {
        super(defaultSourceState);
        this.collectionsMap = new Map(collections.map((c) => [c.collectionName, c]));
        makeObservable(this, {
            pushItem: action,
            updateItem: action,
            deleteItem: action,
            clear: action,
        });
    }

    getItem<Collection extends keyof CollectionsList, Item extends CollectionsList[Collection], Id extends keyof Item>(
        collection: Collection,
        id: Item[Id],
    ): Item | null {
        const idKey = this.getCollection(collection).idKey as unknown as Id;

        return this.getCollectionState<Collection, Item>(collection).find((it) => it[idKey] === id) ?? null;
    }

    pushItem<Collection extends keyof CollectionsList, Item extends CollectionsList[Collection]>(
        collection: Collection,
        item: Item,
    ): void {
        this.getCollectionState<Collection, Item>(collection).push(item);
    }

    updateItem<
        Collection extends keyof CollectionsList,
        Item extends CollectionsList[Collection],
        Id extends keyof Item,
    >(collection: Collection, id: Item[Id], toUpdate: Partial<Item>): void {
        const item = this.getItem(collection, id);

        item && mergeState(item, toUpdate, {});
    }

    deleteItem<
        Collection extends keyof CollectionsList,
        Item extends CollectionsList[Collection],
        Id extends keyof Item,
    >(collection: Collection, id: Item[Id]): void {
        const idKey = this.getCollection(collection).idKey as unknown as Id;
        const collectionState = this.getCollectionState<Collection, Item>(collection);
        const index = collectionState.findIndex((it) => it[idKey] === id);

        if (index !== -1) {
            collectionState.splice(index, 1);
        }
    }

    clear<Collection extends keyof CollectionsList>(collection: Collection): void {
        this.getCollectionState<Collection, any>(collection).splice(0);
    }

    private getCollectionState<Collection extends keyof CollectionsList, Item extends CollectionsList[Collection]>(
        name: Collection,
    ): Item[] {
        const { path } = this.getCollection(name);

        return get(this.state, path);
    }

    private getCollection<Collection extends keyof CollectionsList>(
        name: Collection,
    ): CollectionSettings<CollectionsList, Collection> {
        const settings = this.collectionsMap.get(name);

        if (!settings) {
            const available = [...this.collectionsMap.keys()].map(String).join(', ');
            throw new Error(`Collection "${String(name)}" is not registered. Available: ${available}`);
        }

        return settings as unknown as CollectionSettings<CollectionsList, Collection>;
    }
}
