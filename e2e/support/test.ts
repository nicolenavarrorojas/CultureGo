import { BrowserContext, test as base } from '@playwright/test';

export { expect } from '@playwright/test';

/**
 * La pantalla de bienvenida (app-splash) dura ~4,35 s en cada carga completa y
 * tapa la app: las pruebas recargan antes de cada medición, así que inflaría
 * todos los tiempos. Se oculta para medir solo la operación; la bienvenida no
 * es parte de ningún caso QA.
 */
export async function ocultarBienvenida(contexto: BrowserContext): Promise<void> {
  await contexto.addInitScript(() => {
    // Se inserta al cargar el DOM: antes de eso el documento definitivo aún no existe.
    document.addEventListener('DOMContentLoaded', () => {
      const estilo = document.createElement('style');
      estilo.textContent = 'app-splash { display: none !important; }';
      document.head.appendChild(estilo);
    });
  });
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await ocultarBienvenida(context);
    await use(context);
  },
});
