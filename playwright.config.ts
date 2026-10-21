import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.e2e', quiet: true });
process.env['PLAYWRIGHT_NO_COPY_PROMPT'] = '1';

const RUTA_REPORTE = 'FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/evidencias/e2e-report';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['html', { outputFolder: RUTA_REPORTE, open: 'never' }],
    ['json', { outputFile: `${RUTA_REPORTE}/resultados.json` }],
  ],
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:8100',
    locale: 'es-CL',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'off',
  },
  webServer: {
    command: 'npx ionic serve --no-open',
    url: 'http://localhost:8100',
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
