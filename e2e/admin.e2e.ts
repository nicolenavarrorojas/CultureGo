import { statSync } from 'node:fs';
import { Browser, Page, Request, expect, test } from '@playwright/test';
import { credenciales, rutaEstado } from './support/entorno';
import {
  anotarDiferencia,
  anotarManual,
  anotarTiempo,
  botonAlerta,
  capturar,
  elegirEnHojaDeAcciones,
  exacto,
  escribirSecreto,
  medir,
  nuevoContexto,
  textoContador,
  toast,
} from './support/app';
import {
  admin,
  borrarLugaresDePrueba,
  contarLugares,
  crearLugarDePrueba,
  idCategoria,
  idComuna,
  idL1,
  idU1,
  lugaresPorNombre,
  obtenerGuard,
} from './support/datos';
import { DOCUMENTO_PDF, IMAGEN_GRANDE } from './support/fixtures';

const MARCA = Date.now();
const COLOR_TEATRO = 'rgb(193, 98, 45)';

const panel = (page: Page) => page.locator('app-gestion-lugares');
const filaLugar = (page: Page, nombre: string) =>
  panel(page).locator('.fila-lugar-admin').filter({ has: page.locator('.fila-lugar-nombre', { hasText: exacto(nombre) }) });
const formulario = (page: Page) => page.locator('ion-modal').filter({ visible: true }).filter({ hasText: /Nuevo lugar|Editar lugar/ });

async function abrirPanel(page: Page) {
  await page.goto('/admin/gestion-lugares');
  await expect(panel(page).locator('.fila-lugar-admin').first()).toBeVisible({ timeout: 15_000 });
}

async function conU1<T>(browser: Browser, accion: (page: Page) => Promise<T>): Promise<T> {
  const contexto = await nuevoContexto(browser, { rol: 'u1' });
  try {
    return await accion(await contexto.newPage());
  } finally {
    await contexto.close();
  }
}

async function buscarEnCatalogo(page: Page, texto: string, soloGratis = false): Promise<string> {
  await page.goto('/lugares');
  const catalogo = page.locator('app-lista-lugares');
  await expect(catalogo.locator('.contador-resultados')).toBeVisible();
  if (soloGratis) {
    await catalogo.locator('ion-chip.chip-gratis').click();
    await expect(catalogo.locator('.contador-resultados')).toBeVisible();
  }
  await catalogo.locator('ion-searchbar input').fill(texto);
  await page.waitForTimeout(800);
  await expect(catalogo.locator('.contador-resultados')).toBeVisible();
  return (await catalogo.locator('.contador-resultados').textContent())!.trim();
}

test('QA-23 U1 no accede al panel y ADM entra en ≤ 2 s', async ({ page, browser }) => {
  await conU1(browser, async (paginaU1) => {
    await paginaU1.goto('/admin/gestion-lugares');
    await paginaU1.waitForURL((url) => !url.pathname.startsWith('/admin/gestion-lugares'));
    await expect(paginaU1.locator('app-gestion-lugares')).toHaveCount(0);
    await capturar(paginaU1, 'QA-23 U1 redirigido');
    anotarDiferencia(
      `El guard redirige a /admin/login-admin, que no existe; U1 terminó en ${new URL(paginaU1.url()).pathname}. No hay un acceso de administración.`
    );
  });

  const adm = credenciales('adm');
  await page.goto('/auth/login?redirectTo=%2Fadmin%2Fgestion-lugares');
  const login = page.locator('app-login');
  await login.getByPlaceholder('Correo electrónico').fill(adm.email);
  await escribirSecreto(login.getByPlaceholder('Contraseña', { exact: true }), adm.password);
  const ms = await medir(async () => {
    await login.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(panel(page).locator('.fila-lugar-admin').first()).toBeVisible({ timeout: 15_000 });
  });
  anotarTiempo('Acceso de ADM al panel', ms);
  expect.soft(ms, 'ADM debe acceder al panel en ≤ 2 s').toBeLessThanOrEqual(2000);
  await expect(page.locator('app-gestion-lugares ion-title')).toHaveText('Panel de administración');
});

test.describe('Panel de ADM', () => {
  test.use({ storageState: rutaEstado('adm') });

  test.describe('QA-24', () => {
    const nombreInvalido = `E2E-QA24-INV-${MARCA}`;
    const nombreValido = `E2E-QA24-${MARCA}`;
    test.afterAll(() => borrarLugaresDePrueba('E2E-QA24-'));

    test('QA-24 crear lugar: rechaza datos incompletos o fuera de rango y guarda uno válido', async ({ page, browser }) => {
      await abrirPanel(page);
      await panel(page).getByRole('button', { name: 'Nuevo lugar' }).click();
      const modal = formulario(page);
      await expect(modal).toContainText('Nuevo lugar');
      const crear = modal.getByRole('button', { name: 'Crear lugar' });

      await elegirEnHojaDeAcciones(page, modal.locator('ion-select[name="id_categoria"]'), 'Teatro');
      await elegirEnHojaDeAcciones(page, modal.locator('ion-select[name="id_comuna"]'), 'Providencia');
      await expect(crear, 'Con el nombre vacío no debe poder guardarse').toBeDisabled();
      await expect
        .soft(modal.getByText(/obligatori|requerid|completa|falta/i), 'Debe indicar qué dato corregir')
        .toBeVisible({ timeout: 1000 });

      await modal.locator('input[name="nombre"]').fill(nombreInvalido);
      await modal.locator('input[name="latitud"]').fill('95');
      await modal.locator('input[name="longitud"]').fill('-70.63');
      if (await crear.isEnabled()) await crear.click();
      await page.waitForTimeout(2000);
      expect
        .soft(await lugaresPorNombre(nombreInvalido), 'Una latitud fuera de rango debe rechazarse (incidencia H-08)')
        .toHaveLength(0);

      if (!(await modal.isVisible())) {
        await panel(page).getByRole('button', { name: 'Nuevo lugar' }).click();
        await elegirEnHojaDeAcciones(page, formulario(page).locator('ion-select[name="id_categoria"]'), 'Teatro');
        await elegirEnHojaDeAcciones(page, formulario(page).locator('ion-select[name="id_comuna"]'), 'Providencia');
      }
      const valido = formulario(page);
      await valido.locator('input[name="nombre"]').fill(nombreValido);
      await valido.locator('textarea[name="descripcion"]').fill('E2E- lugar creado por QA-24');
      await valido.locator('input[name="latitud"]').fill('-33.4285');
      await valido.locator('input[name="longitud"]').fill('-70.6205');
      const ms = await medir(async () => {
        await valido.getByRole('button', { name: 'Crear lugar' }).click();
        await expect(toast(page, 'Lugar creado.')).toBeVisible();
      });
      anotarTiempo('Creación de lugar', ms);
      expect.soft(ms, 'El lugar debe guardarse en ≤ 2 s').toBeLessThanOrEqual(2000);
      expect(await lugaresPorNombre(nombreValido)).toHaveLength(1);

      const filtro = {
        conCoordenadas: true,
        id_categoria: await idCategoria('Teatro'),
        id_comuna: await idComuna('Providencia'),
      };
      await conU1(browser, async (paginaU1) => {
        expect(await buscarEnCatalogo(paginaU1, nombreValido)).toBe(textoContador(1));
        await expect(paginaU1.locator('app-lista-lugares .tarjeta-nombre')).toHaveText(nombreValido);

        await paginaU1.goto('/tabs/mapa');
        const mapa = paginaU1.locator('app-pagina-mapa');
        const marcadores = mapa.locator('.leaflet-marker-icon.pin-lugar');
        await expect(marcadores.first()).toBeVisible({ timeout: 15_000 });
        await mapa.locator('.fila-categorias ion-chip').filter({ hasText: exacto('Teatro') }).click();
        await elegirEnHojaDeAcciones(paginaU1, mapa.locator('ion-select.select-comuna'), 'Providencia');
        await expect(marcadores).toHaveCount(await contarLugares(filtro));
        const colores = await marcadores.locator('.pin-punto').evaluateAll((pins) =>
          pins.map((pin) => getComputedStyle(pin).backgroundColor)
        );
        expect([...new Set(colores)], 'El marcador debe tener el color de su categoría').toEqual([COLOR_TEATRO]);
        await capturar(paginaU1, 'QA-24 mapa de U1');
      });
    });
  });

  test('QA-25 editar L1, rechazar PDF y comprimir la imagen subida', async ({ page, browser }) => {
    const subidas: { ruta: string; bytes: number }[] = [];
    const pendientes: Promise<void>[] = [];
    page.on('request', (request: Request) => {
      const coincidencia = request.url().match(/\/storage\/v1\/object\/lugares\/([^?]+)/);
      if (!coincidencia || request.method() !== 'POST') return;
      pendientes.push(
        request.response().then(async () => {
          const cabeceras = await request.allHeaders();
          const bytes = Number(cabeceras['content-length'] ?? 0) || (request.postDataBuffer()?.length ?? 0);
          subidas.push({ ruta: decodeURIComponent(coincidencia[1]), bytes });
        })
      );
    });
    const horario = `E2E- Lunes a viernes 09:00 - 18:00 (${MARCA})`;

    try {
      await abrirPanel(page);
      await filaLugar(page, 'E2E-L1').getByRole('button', { name: 'Editar' }).click();
      const modal = formulario(page);
      await expect(modal).toContainText('Editar lugar');
      await modal.locator('input[name="horario"]').fill(horario);
      await modal.locator('ion-checkbox[name="es_gratuito"]').click();

      const archivo = modal.locator('input[type="file"]');
      await archivo.setInputFiles(DOCUMENTO_PDF);
      await expect(toast(page, 'Solo se permiten archivos de imagen.')).toBeVisible();
      await page.waitForTimeout(500);
      expect(subidas, 'El PDF no debe subirse').toHaveLength(0);

      await archivo.setInputFiles(IMAGEN_GRANDE);
      await expect.poll(() => subidas.length, { timeout: 30_000 }).toBe(1);
      await Promise.all(pendientes);
      await expect(modal.getByRole('button', { name: 'Cambiar imagen' })).toBeVisible({ timeout: 15_000 });
      const original = statSync(IMAGEN_GRANDE).size;
      test.info().annotations.push({
        type: 'nota',
        description: `Imagen original: ${original} bytes; subida: ${subidas[0].bytes} bytes.`,
      });
      expect(subidas[0].bytes, 'Debe poder medirse el tamaño de la subida').toBeGreaterThan(0);
      expect(subidas[0].bytes, 'La imagen subida debe pesar menos que la original').toBeLessThan(original);

      await modal.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(toast(page, 'Lugar actualizado.')).toBeVisible();
      const { data: l1 } = await admin
        .from('lugar')
        .select('horario, es_gratuito, url_imagen_principal')
        .eq('id_lugar', idL1())
        .single();
      expect(l1).toMatchObject({ horario, es_gratuito: false });
      expect(l1!.url_imagen_principal).toContain(subidas[0].ruta);

      await conU1(browser, async (paginaU1) => {
        await paginaU1.goto(`/lugares/${idL1()}`);
        const detalle = paginaU1.locator('app-detalle-lugar');
        await expect(detalle.locator('h1')).toHaveText('E2E-L1');
        await expect(detalle).toContainText(horario);
        await expect(detalle.locator('.fila-info').filter({ hasText: /^\s*Pagado\s*$/ })).toBeVisible();
        await capturar(paginaU1, 'QA-25 detalle de L1 para U1');
        expect(await buscarEnCatalogo(paginaU1, 'E2E-L1', true)).toBe(textoContador(0));
        expect(await buscarEnCatalogo(paginaU1, 'E2E-L1')).toBe(textoContador(1));
      });
      anotarManual('Revisar que la imagen subida se vea nítida en el detalle.');
    } finally {
      const guard = await obtenerGuard();
      await guard.ejecutar({
        tabla: 'lugar',
        accion: 'update',
        cambios: { horario: null, es_gratuito: true, url_imagen_principal: null },
        filtro: { tipo: 'lugaresE2E', columna: 'id_lugar', ids: [idL1()] },
      });
      await guard.borrarArchivosLugares(subidas.map((s) => s.ruta));
    }
  });

  test.describe('QA-26', () => {
    const nombre = `E2E-QA26-${MARCA}`;
    test.afterAll(() => borrarLugaresDePrueba('E2E-QA26-'));

    test('QA-26 eliminar un lugar E2E- pide confirmación y lo quita del catálogo y del mapa', async ({ page, browser }) => {
      await crearLugarDePrueba(nombre, { categoria: 'Cine', comuna: 'Ñuñoa' });
      await abrirPanel(page);
      await filaLugar(page, nombre).getByRole('button', { name: 'Eliminar' }).click();
      await expect(page.locator('ion-alert')).toContainText('Eliminar lugar');
      await expect(page.locator('ion-alert')).toContainText(nombre);
      await botonAlerta(page, 'Eliminar').click();
      await expect(toast(page, 'Lugar eliminado.')).toBeVisible();
      await expect(filaLugar(page, nombre)).toHaveCount(0);
      expect(await lugaresPorNombre(nombre)).toHaveLength(0);

      await conU1(browser, async (paginaU1) => {
        expect(await buscarEnCatalogo(paginaU1, nombre)).toBe(textoContador(0));
        await paginaU1.goto('/tabs/mapa');
        await expect(paginaU1.locator('app-pagina-mapa .leaflet-marker-icon.pin-lugar')).toHaveCount(
          await contarLugares({ conCoordenadas: true }),
          { timeout: 15_000 }
        );
      });
    });
  });

  test('QA-27 reporte de U1 en L1, ADM lo resuelve y U1 lo ve en «Mis tickets»', async ({ page, browser }) => {
    const descripcion = `E2E- reporte QA-27: el horario publicado no coincide (${MARCA})`;

    await conU1(browser, async (paginaU1) => {
      await paginaU1.goto(`/lugares/${idL1()}`);
      await paginaU1.locator('app-detalle-lugar').getByRole('button', { name: 'Reportar un problema con este lugar' }).click();
      const modal = paginaU1.locator('ion-modal').filter({ visible: true }).filter({ hasText: 'Reportar este lugar' });
      await elegirEnHojaDeAcciones(paginaU1, modal.locator('ion-select'), 'Algo está mal en este lugar');
      const enviar = modal.getByRole('button', { name: 'Enviar reporte' });
      await expect(enviar, 'Con la descripción vacía no debe poder enviarse').toBeDisabled();
      await modal.locator('textarea').fill(descripcion);
      const ms = await medir(async () => {
        await enviar.click();
        await expect(toast(paginaU1, '¡Gracias! Tu reporte fue enviado.')).toBeVisible();
      });
      anotarTiempo('Envío de reporte', ms);
      expect.soft(ms, 'El reporte debe registrarse en ≤ 2 s').toBeLessThanOrEqual(2000);
    });
    const { data: reporte } = await admin
      .from('reporte')
      .select('id_reporte, estado, id_lugar')
      .eq('descripcion', descripcion)
      .single();
    expect(reporte).toMatchObject({ estado: 'pendiente', id_lugar: idL1() });

    await abrirPanel(page);
    await panel(page).locator('ion-segment-button[value="reportes"]').click();
    const fila = panel(page).locator('.fila-reporte').filter({ hasText: descripcion });
    await expect(fila).toContainText('Sobre: E2E-L1');
    await expect(fila).toContainText('Pendiente');
    for (const [etiqueta, estado] of [
      ['En revisión', 'en_revision'],
      ['Resuelto', 'resuelto'],
    ] as const) {
      await fila.click();
      await page.locator('ion-alert').getByRole('radio', { name: etiqueta }).click();
      await botonAlerta(page, 'Guardar').click();
      await expect
        .poll(async () => (await admin.from('reporte').select('estado').eq('id_reporte', reporte!.id_reporte).single()).data?.estado)
        .toBe(estado);
      await expect(page.locator('ion-alert')).toBeHidden();
    }
    await expect(fila).toHaveCount(0);

    await conU1(browser, async (paginaU1) => {
      await paginaU1.goto('/perfil/mis-tickets');
      const ticket = paginaU1.locator('app-mis-tickets .fila-ticket').filter({ hasText: descripcion });
      await expect(ticket.locator('.badge-estado')).toHaveText('Resuelto');
      await capturar(paginaU1, 'QA-27 mis tickets');
    });
  });

  test.describe('QA-28', () => {
    const nombres = { aprobada: `E2E-QA28-A-${MARCA}`, rechazada: `E2E-QA28-B-${MARCA}` };
    test.afterAll(() => borrarLugaresDePrueba('E2E-QA28-'));

    test('QA-28 dos sugerencias de U1: ADM aprueba una y rechaza otra', async ({ page, browser }) => {
      await conU1(browser, async (paginaU1) => {
        await paginaU1.goto('/tabs/mapa');
        for (const nombre of Object.values(nombres)) {
          await paginaU1.locator('app-pagina-mapa').getByRole('button', { name: 'Sugerir un lugar' }).click();
          const modal = paginaU1.locator('ion-modal').filter({ visible: true }).filter({ hasText: 'Sugerir un lugar' });
          const miniMapa = modal.locator('.mini-mapa');
          await expect(miniMapa.locator('.leaflet-tile-container')).toBeAttached({ timeout: 15_000 });
          await miniMapa.click({ position: { x: 120, y: 80 } });
          await expect(modal.locator('.coords-seleccionadas')).toContainText('📍');
          await modal.locator('input[type="text"]').fill(nombre);
          await elegirEnHojaDeAcciones(paginaU1, modal.locator('ion-select'), 'Museo');
          await modal.locator('textarea').fill(`E2E- sugerencia de prueba ${nombre}`);
          const ms = await medir(async () => {
            await modal.getByRole('button', { name: 'Enviar sugerencia' }).click();
            await expect(toast(paginaU1, '¡Gracias! Tu sugerencia fue enviada.')).toBeVisible();
          });
          anotarTiempo('Envío de sugerencia', ms);
          expect.soft(ms, 'La sugerencia debe quedar pendiente en ≤ 2 s').toBeLessThanOrEqual(2000);
          await expect(modal).toBeHidden({ timeout: 5000 });
        }
      });
      const estados = async () => {
        const { data } = await admin
          .from('lugar_sugerido')
          .select('nombre, estado')
          .eq('id_usuario', idU1())
          .in('nombre', Object.values(nombres));
        return Object.fromEntries((data ?? []).map((s) => [s.nombre, s.estado]));
      };
      expect(await estados()).toEqual({ [nombres.aprobada]: 'pendiente', [nombres.rechazada]: 'pendiente' });

      await abrirPanel(page);
      await panel(page).locator('ion-segment-button[value="sugerencias"]').click();
      const filaA = panel(page).locator('.fila-sugerencia').filter({ hasText: nombres.aprobada });
      await expect(filaA.locator('.fila-sugerencia-coords')).toContainText('📍');
      await filaA.getByRole('button', { name: 'Revisar y publicar' }).click();
      const modal = formulario(page);
      await expect(modal.locator('input[name="nombre"]')).toHaveValue(nombres.aprobada);
      await expect(modal.locator('.mini-mapa-admin .leaflet-marker-icon'), 'El mini-mapa debe mostrar la ubicación').toBeVisible();
      anotarDiferencia('Aprobar una sugerencia exige completar y publicar el formulario de «Nuevo lugar»: la aprobación crea el lugar.');
      await elegirEnHojaDeAcciones(page, modal.locator('ion-select[name="id_comuna"]'), 'Santiago');
      await modal.getByRole('button', { name: 'Crear lugar' }).click();
      await expect(toast(page, 'Lugar creado.')).toBeVisible();

      const filaB = panel(page).locator('.fila-sugerencia').filter({ hasText: nombres.rechazada });
      await filaB.getByRole('button', { name: 'Rechazar' }).click();
      await botonAlerta(page, 'Rechazar').click();
      await expect(toast(page, 'Sugerencia rechazada.')).toBeVisible();
      await expect.poll(estados).toEqual({ [nombres.aprobada]: 'aprobado', [nombres.rechazada]: 'rechazado' });

      await conU1(browser, async (paginaU1) => {
        await paginaU1.goto('/perfil/mis-tickets');
        const tickets = paginaU1.locator('app-mis-tickets');
        await tickets.locator('ion-segment-button[value="sugerencias"]').click();
        await expect(tickets.locator('.fila-ticket').filter({ hasText: nombres.aprobada }).locator('.badge-estado')).toHaveText('Aprobado');
        await expect(tickets.locator('.fila-ticket').filter({ hasText: nombres.rechazada }).locator('.badge-estado')).toHaveText('Rechazado');
        await capturar(paginaU1, 'QA-28 mis tickets');
        expect
          .soft(await buscarEnCatalogo(paginaU1, nombres.aprobada), 'La aprobación no debe crear un lugar en el catálogo')
          .toBe(textoContador(0));
      });
    });
  });
});
