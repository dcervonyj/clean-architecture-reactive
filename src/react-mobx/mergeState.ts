import { cloneDeep, forEach, get, has, isArray, isFunction, isMap, isObject, isSet, set, without } from 'lodash-es';
import { isObservableMap, isObservableSet } from 'mobx';
import { computedFn } from 'mobx-utils';

export const mergeState = (target: object, source: object, prevSource: object | undefined): void => {
    const sourceKeys = Object.keys(source);
    const prevSourceKeys = prevSource ? Object.keys(prevSource) : [];

    const keysToDelete = without(prevSourceKeys, ...sourceKeys);

    keysToDelete.forEach((key) => delete target[key as keyof typeof target]);

    forEach(source, (value, key) => {
        const targetValue = get(target, key);
        const prevSourceValue = get(prevSource, key);
        const existsInTarget = has(target, key);

        if (isFunction(value)) {
            set(target, key, computedFn(value));
        } else if (value !== targetValue && (!targetValue || !value)) {
            const sourceValue = isObject(value) ? cloneDeep(value) : value;

            set(target, key, sourceValue);
        } else if (!existsInTarget || (isArray(value) && isArray(targetValue) && value !== targetValue)) {
            set(target, key, value);
        } else if (isMap(value) && isObservableMap(targetValue)) {
            set(target, key, value);
        } else if (isSet(value) && isObservableSet(targetValue)) {
            set(target, key, value);
        } else if (isObject(value) && isObject(targetValue)) {
            mergeState(targetValue, value, prevSourceValue);
        } else {
            if (value !== targetValue) {
                set(target, key, value);
            }
        }
    });
};
