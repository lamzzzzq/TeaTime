module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // 在生产构建时忽略这些警告
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    // 允许未使用的变量（在开发阶段）
    'no-unused-vars': 'warn'
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }]
      }
    }
  ]
};
