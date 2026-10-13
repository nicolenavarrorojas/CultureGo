import { Page, expect, test } from '@playwright/test';
import { credenciales, leerSeedInfo, rutaEstado } from './support/entorno';
import { anotarTiempo, iniciarSesionUI, medir, toast } from './support/app';
import { contarVisitas, coordenadasL1, idL1, idU1, medallasDe } from './support/datos';

const botonVisita = (page: Page) => page.locator('app-detalle-lugar').getByRole('button', { name: 'Registrar visita' });

async function abrirL1(page: Page) {
  await page.goto(`/lugares/${idL1()}`);
  await expect(page.locator('app-detalle-lugar h1')).toHaveText('E2E-L1');
}

async function contadorLugares(page: Page): Promise<string> {
  await page.goto('/tabs/perfil');
  const valor = page.locator('app-pagina-perfil .stat-box').filter({ hasText: 'Lugares' }).locator('.stat-numero');
  await expect(valor).not.toHaveText('—');
  return (await valor.textContent())!.trim();
}

test('QA-11 sin sesión, «Registrar visita» lleva a login y vuelve al detalle de L1', async ({ page }) => {
  const u1 = credenciales('u1');
  const visitasAntes = await contarVisitas(idU1(), idL1());
  await abrirL1(page);
  await botonVisita(page).click();
  await expect(toast(page, 'Inicia sesión para registrar tu visita')).toBeVisible();
  const urlLogin = `/auth/login?redirectTo=%2Flugares%2F${idL1()}`;
  await expect(page).toHaveURL(urlLogin, { timeout: 5000 });
  expect(await contarVisitas(idU1(), idL1()), 'No debe crearse ninguna visita').toBe(visitasAntes);

  await iniciarSesionUI(page, u1.email, `Incorrecta-${Date.now()}`);
  await expect(toast(page, 'Correo o contraseña incorrectos.')).toBeVisible();
  await expect(page, 'El intento fallido debe conservar redirectTo').toHaveURL(urlLogin);

  await iniciarSesionUI(page, u1.email, u1.password);
  await expect(page).toHaveURL(`/lugares/${idL1()}`);
  await expect(page.locator('app-detalle-lugar h1')).toHaveText('E2E-L1');
});

test.describe('Visitas de U1', () => {
  test.use({ storageState: rutaEstado('u1') });

  test.describe('Lejos de L1', () => {
    test.use({
      permissions: ['geolocation'],
      geolocation: { latitude: coordenadasL1().latitude + 0.05, longitude: coordenadasL1().longitude },
    });

    test('QA-13 visita fuera del radio se rechaza', async ({ page }) => {
      const medallasAntes = await medallasDe(idU1());
      await abrirL1(page);
      await botonVisita(page).click();
      await expect(toast(page, /Acércate para registrar tu visita/)).toBeVisible();
      expect(await contarVisitas(idU1(), idL1()), 'No debe crearse la visita').toBe(0);
      expect((await medallasDe(idU1())).sort()).toEqual(medallasAntes.sort());
    });
  });

  test('QA-16 sin permiso de ubicación no se registra la visita', async ({ page, context }) => {
    await context.clearPermissions();
    await abrirL1(page);
    await botonVisita(page).click();
    const mensaje = toast(page).first();
    await expect(mensaje).toBeVisible({ timeout: 15_000 });
    expect(await mensaje.textContent(), 'Debe informar que falta el permiso de ubicación').toMatch(/ubicaci[oó]n|permiso/i);
    expect(await contarVisitas(idU1(), idL1())).toBe(0);
  });

  test.describe('En L1', () => {
    test.use({ permissions: ['geolocation'], geolocation: coordenadasL1() });

    test('QA-14 visita en L1 se registra, otorga la medalla y actualiza el historial', async ({ page }) => {
      const { medalla } = leerSeedInfo();
      expect(await medallasDe(idU1()), 'U1 no debe tener aún la medalla').not.toContain(medalla.id_medalla);
      const lugaresAntes = Number(await contadorLugares(page));

      await abrirL1(page);
      const ms = await medir(async () => {
        await botonVisita(page).click();
        await expect(toast(page, '¡Visita registrada!')).toBeVisible();
      });
      anotarTiempo('Registro de visita', ms);
      expect.soft(ms, 'La visita debe registrarse en ≤ 2 s').toBeLessThanOrEqual(2000);
      await expect
        .soft(page.getByText(medalla.nombre), `Debe notificarse la medalla «${medalla.nombre}» en ≤ 1 s`)
        .toBeVisible({ timeout: 1000 });

      expect(await contarVisitas(idU1(), idL1())).toBe(1);
      await expect.poll(() => medallasDe(idU1()), { message: 'La medalla debe otorgarse' }).toContain(medalla.id_medalla);

      expect(Number(await contadorLugares(page)), 'El contador de lugares debe subir en 1').toBe(lugaresAntes + 1);
      await expect(page.locator('app-pagina-perfil .lista-medallas')).toContainText(medalla.nombre);

      await page.goto('/perfil/historial');
      const historial = page.locator('app-medallas');
      await expect(historial.locator('.fila-lugar').filter({ hasText: 'E2E-L1' })).toBeVisible();
      await historial.locator('ion-segment-button[value="medallas"]').click();
      const fila = historial.locator('.fila-medalla').filter({ hasText: medalla.nombre });
      await expect(fila).toContainText('Obtenida el');
      await expect(historial.locator('.fila-medalla.bloqueada .fila-medalla-progreso-texto').first()).toBeVisible();
    });

    test('QA-15 repetir la visita a L1 se rechaza por visita reciente', async ({ page }) => {
      test.skip((await contarVisitas(idU1(), idL1())) === 0, 'QA-14 no registró la visita a L1.');
      const medallasAntes = await medallasDe(idU1());
      const lugaresAntes = await contadorLugares(page);
      await abrirL1(page);
      await botonVisita(page).click();
      const mensaje = toast(page).first();
      await expect(mensaje).toBeVisible();
      expect(await mensaje.textContent(), 'Debe indicar que la visita es reciente').toMatch(
        /reciente|hace poco|ya registraste|vuelve m[aá]s tarde|espera/i
      );
      expect(await contarVisitas(idU1(), idL1())).toBe(1);
      expect((await medallasDe(idU1())).sort()).toEqual(medallasAntes.sort());
      expect(await contadorLugares(page)).toBe(lugaresAntes);
    });
  });
});
