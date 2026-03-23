module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|scss)$': 'identity-obj-proxy',
    '^reactflow$': '<rootDir>/src/__mocks__/reactflow.tsx',
    '^reactflow/dist/style.css$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'commonjs',
        esModuleInterop: true,
        allowJs: true,
        strict: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        isolatedModules: true,
        paths: { '@/*': ['./src/*'] },
      },
    }],
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  transformIgnorePatterns: [
    '/node_modules/',
  ],
}
