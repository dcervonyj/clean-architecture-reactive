import { cloneDeep, isArray, isFunction, isMap, isObject, isSet } from 'lodash-es';
import { isObservableMap, isObservableSet } from 'mobx';
import { computedFn } from 'mobx-utils';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const mergeState = (target: object, source: object, prevSource: object | undefined): void => {
    const sourceKeys = Object.keys(source).filter((k) => !DANGEROUS_KEYS.has(k));
    const prevSourceKeys = prevSource ? Object.keys(prevSource).filter((k) => !DANGEROUS_KEYS.has(k)) : [];

    for (const key of prevSourceKeys) {
        if (!sourceKeys.includes(key)) {
            delete (target as Record<string, unknown>)[key];
        }
    }

    for (const key of sourceKeys) {
        const value = (source as Record<string, unknown>)[key];
        const targetValue = (target as Record<string, unknown>)[key];
        const prevSourceValue = prevSource ? (prevSource as Record<string, unknown>)[key] : undefined;
        const existsInTarget = Object.prototype.hasOwnProperty.call(target, key);

        if (isFunction(value)) {
            (target as Record<string, unknown>)[key] = computedFn(value as (...args: unknown[]) => unknown);
        } else if (value !== targetValue && (!targetValue || !value)) {
            (target as Record<string, unknown>)[key] = isObject(value) ? cloneDeep(value) : value;
        } else if (!existsInTarget || (isArray(value) && isArray(targetValue) && value !== targetValue)) {
            (target as Record<string, unknown>)[key] = value;
        } else if (isMap(value) && isObservableMap(targetValue)) {
            (target as Record<string, unknown>)[key] = value;
        } else if (isSet(value) && isObservableSet(targetValue)) {
            (target as Record<string, unknown>)[key] = value;
        } else if (isObject(value) && isObject(targetValue)) {
            mergeState(targetValue as object, value as object, prevSourceValue as object | undefined);
        } else if (value !== targetValue) {
            (target as Record<string, unknown>)[key] = value;
        }
    }
};
