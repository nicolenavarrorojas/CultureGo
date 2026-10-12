import { Page, expect, test } from '@playwright/test';
import { rutaEstado } from './support/entorno';
import { anotarDiferencia, anotarManual } from './support/app';
import { idL1 } from './support/datos';

const CLASE_OSCURA = /(^|\s)tema-oscuro(\s|$)/;

const toggle = (page: Page) => page.locator('app-pagina-perfil ion-toggle[aria-label="Modo oscuro"]');

test.describe('Modo oscuro de U1', () => {
  test.use({ storageState: rutaEstado('u1') });

  test('QA-22 el modo oscuro se aplica y se mantiene al recargar en ambos sentidos', async ({ page }) => {
    const html = page.locator('html');
    await page.goto('/tabs/perfil');
    await expect(html).not.toHaveClass(CLASE_OSCURA);

    await toggle(page).click();
    await expect(html).toHaveClass(CLASE_OSCURA);
    await page.reload();
    await expect(html).toHaveClass(CLASE_OSCURA);
    await expect(toggle(page)).toHaveJSProperty('checked', true);

    for (const ruta of ['/tabs/inicio', '/tabs/mapa', `/lugares/${idL1()}`, '/tabs/perfil']) {
      await page.goto(ruta);
      await expect(html, `El tema oscuro debe mantenerse en ${ruta}`).toHaveClass(CLASE_OSCURA);
    }

    await toggle(page).click();
    await expect(html).not.toHaveClass(CLASE_OSCURA);
    await page.reload();
    await expect(html).not.toHaveClass(CLASE_OSCURA);
    await expect(toggle(page)).toHaveJSProperty('checked', false);

    anotarDiferencia('El interruptor del modo oscuro está en Perfil, no en Configuración.');
    anotarManual('Verificar que no hay destello del otro tema al reabrir y el contraste de textos, chips, tarjetas y pestañas.');
  });
});
