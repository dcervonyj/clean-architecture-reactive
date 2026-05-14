import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@reactive': new URL('./src', import.meta.url).pathname,
        },
    },
    test: {
        globals: true,
    },
});
