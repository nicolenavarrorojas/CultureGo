import { Locator, Page, expect, test } from '@playwright/test';
import { credenciales, rutaEstado } from './support/entorno';
import { anotarDiferencia, anotarManual, anotarTiempo, capturar, iniciarSesionUI, medir, nuevoContexto, toast } from './support/app';
import { admin, idU1 } from './support/datos';
import { guardarEnCadena, leerDeCadena } from './support/cadena';

type Configuracion = Record<'cabeza' | 'ojos' | 'boca' | 'cuerpo', number>;

const CONTROLES: { parte: keyof Configuracion; etiqueta: string; plan: string }[] = [
  { parte: 'boca', etiqueta: 'Boca', plan: 'boca' },
  { parte: 'ojos', etiqueta: 'Ojos', plan: 'ojos' },
  { parte: 'cabeza', etiqueta: 'Cabeza', plan: 'accesorio' },
  { parte: 'cuerpo', etiqueta: 'Cuerpo', plan: 'ropa' },
];

async function leerAvatar(preview: Locator): Promise<Configuracion> {
  await expect(preview).toBeVisible();
  return preview.evaluate((elemento) => {
    const leer = (parte: string) => {
      const capa = elemento.querySelector<HTMLElement>(`.capa-${parte}`);
      const coincidencia = capa?.style.backgroundImage.match(new RegExp(`${parte}-(\\d+)\\.png`));
      return coincidencia ? Number(coincidencia[1]) : 0;
    };
    return { cabeza: leer('cabeza'), ojos: leer('ojos'), boca: leer('boca'), cuerpo: leer('cuerpo') };
  });
}

async function avatarEnBase(): Promise<Configuracion> {
  const { data, error } = await admin
    .from('usuario')
    .select('avatar_cabeza, avatar_ojos, avatar_boca, avatar_cuerpo')
    .eq('id_usuario', idU1())
    .single();
  if (error) throw error;
  return { cabeza: data.avatar_cabeza, ojos: data.avatar_ojos, boca: data.avatar_boca, cuerpo: data.avatar_cuerpo };
}

const previewPerfil = (page: Page) => page.locator('app-pagina-perfil .avatar-circulo app-avatar-preview');

test.describe('Avatar de U1', () => {
  test.use({ storageState: rutaEstado('u1') });

  test.describe('Personalización', () => {
    test('QA-19 personalizar el avatar, guardar y verlo en Perfil e Inicio', async ({ page }) => {
      await page.goto('/perfil/personalizar-avatar');
      const pantalla = page.locator('app-personalizar-avatar');
      const preview = pantalla.locator('.avatar-preview app-avatar-preview');
      await expect.poll(() => leerAvatar(preview)).toEqual(await avatarEnBase());
      const inicial = await leerAvatar(preview);

      for (const control of CONTROLES) {
        const antes = await leerAvatar(preview);
        await pantalla.getByRole('button', { name: `Siguiente: ${control.etiqueta}` }).click();
        const despues = await leerAvatar(preview);
        expect(despues[control.parte], `La vista previa debe cambiar ${control.plan} antes de guardar`).not.toBe(antes[control.parte]);
      }
      await expect.soft(pantalla.getByText(/color/i), 'Debe existir un control de color').toBeVisible({ timeout: 1000 });
      anotarDiferencia('El plan pide boca, ojos, accesorio, ropa y color; la app ofrece Cabeza, Ojos, Boca y Cuerpo, sin color.');

      const guardado = await leerAvatar(preview);
      expect(guardado).not.toEqual(inicial);
      const ms = await medir(async () => {
        await pantalla.getByRole('button', { name: 'Guardar cambios' }).click();
        await expect(toast(page, 'Avatar guardado')).toBeVisible();
      });
      anotarTiempo('Guardado del avatar', ms);
      expect.soft(ms, 'El guardado debe confirmarse en ≤ 2 s').toBeLessThanOrEqual(2000);
      expect(await avatarEnBase()).toEqual(guardado);
      guardarEnCadena('qa19', guardado);

      await page.goto('/tabs/perfil');
      expect(await leerAvatar(previewPerfil(page))).toEqual(guardado);
      await page.goto('/tabs/inicio');
      await expect(page.locator('app-pagina-inicio h1')).toBeVisible();
      const previewInicio = page.locator('app-pagina-inicio app-avatar-preview');
      await expect.soft(previewInicio, 'El avatar actualizado debe verse en Inicio').toBeVisible({ timeout: 2000 });
      if (await previewInicio.isVisible()) expect.soft(await leerAvatar(previewInicio)).toEqual(guardado);
    });

    test('QA-20 el avatar persiste al borrar localStorage y en otro navegador', async ({ page, browser }) => {
      const guardado = leerDeCadena<Configuracion>('qa19');
      test.skip(!guardado, 'QA-19 no guardó el avatar que este caso verifica.');
      const u1 = credenciales('u1');
      await page.goto('/tabs/perfil');
      await expect(previewPerfil(page)).toBeVisible();
      await page.evaluate(() => localStorage.clear());
      await page.goto('/auth/login');
      await iniciarSesionUI(page, u1.email, u1.password);
      await expect(page).toHaveURL(/\/tabs\/inicio/);
      await page.goto('/tabs/perfil');
      expect(await leerAvatar(previewPerfil(page))).toEqual(guardado);

      const otro = await nuevoContexto(browser, { rol: 'u1' });
      try {
        const paginaOtra = await otro.newPage();
        await paginaOtra.goto('/tabs/perfil');
        expect(await leerAvatar(previewPerfil(paginaOtra))).toEqual(guardado);
        await capturar(paginaOtra, 'QA-20 avatar en contexto nuevo');
      } finally {
        await otro.close();
      }
      expect(await avatarEnBase(), 'La fila de U1 debe tener las piezas guardadas').toEqual(guardado);
      anotarManual('La configuración no incluye color: la app no tiene ese control (ver QA-19).');
    });
  });

  test('QA-21 un ítem bloqueado se ve bloqueado y no puede aplicarse', async ({ page }) => {
    await page.goto('/perfil/personalizar-avatar');
    const pantalla = page.locator('app-personalizar-avatar');
    await expect(pantalla.locator('.avatar-preview app-avatar-preview')).toBeVisible();
    const indicadorBloqueo = pantalla.locator('[class*="bloquead"], [aria-disabled="true"], ion-icon[name*="lock"]').or(
      pantalla.getByText(/(^|\s)bloquead|desbloquea con|requiere la medalla/i)
    );

    let encontrado = false;
    for (const control of CONTROLES) {
      for (let paso = 0; paso < 12 && !encontrado; paso++) {
        await pantalla.getByRole('button', { name: `Siguiente: ${control.etiqueta}` }).click();
        encontrado = (await indicadorBloqueo.count()) > 0;
      }
    }
    await capturar(page, 'QA-21 personalización');
    anotarManual(
      'Verificar con una cuenta que tenga la medalla que el ítem queda disponible: la app no tiene ítems asociados a medallas.'
    );
    expect(encontrado, 'Debe existir al menos un ítem bloqueado que se muestre como tal').toBe(true);
  });
});
