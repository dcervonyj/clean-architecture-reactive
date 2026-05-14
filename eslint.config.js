import tseslint from 'typescript-eslint';

export default tseslint.config(...tseslint.configs.recommended, {
    ignores: ['**/*.js', 'lib'],
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
    },
});
