import { Browser, Page } from '@playwright/test';
import { expect, test } from './support/test';
import { anotarTiempo, capturar, elegirEnHojaDeAcciones, medir, nuevoContexto, toast } from './support/app';
import { admin, idU1 } from './support/datos';

// QA-31: sugerir un lugar escribiendo la dirección o usando la ubicación actual.
// Nominatim se simula: la prueba no llama al servicio real (su política limita las solicitudes).

const DUOC_SAN_JOAQUIN = { latitude: -33.49996, longitude: -70.61663 };
const DIRECCION_UBICACION = 'DUOC UC San Joaquín, 4917, Avenida Vicuña Mackenna, Villa Eleodoro Gormaz, San Joaquín';
const RESULTADOS_BUSQUEDA = [
  {
    display_name: 'Palacio Museo de Bellas Artes, Mosqueto, Santiago, Provincia de Santiago, Región Metropolitana de Santiago, Chile',
    lat: '-33.4357',
    lon: '-70.6440',
  },
  {
    display_name: 'Museo Nacional de Bellas Artes, 650, José Miguel de la Barra, Santiago, Provincia de Santiago, 8320000, Chile',
    lat: '-33.43534',
    lon: '-70.64358',
  },
];

/** Responde las búsquedas a Nominatim con datos fijos y cuenta las solicitudes. */
async function simularNominatim(page: Page) {
  const solicitudes: string[] = [];
  await page.route('https://nominatim.openstreetmap.org/**', async (ruta) => {
    const url = new URL(ruta.request().url());
    solicitudes.push(url.pathname);
    const cuerpo = url.pathname === '/reverse'
      ? { display_name: `${DIRECCION_UBICACION}, Provincia de Santiago, 8940000, Chile`, lat: '-33.49996', lon: '-70.61663' }
      : RESULTADOS_BUSQUEDA;
    await ruta.fulfill({ json: cuerpo, headers: { 'access-control-allow-origin': '*' } });
  });
  return solicitudes;
}

async function conU1EnDuoc<T>(browser: Browser, accion: (page: Page) => Promise<T>): Promise<T> {
  const contexto = await nuevoContexto(browser, { rol: 'u1', ubicacion: DUOC_SAN_JOAQUIN });
  try {
    return await accion(await contexto.newPage());
  } finally {
    await contexto.close();
  }
}

test.describe('QA-31', () => {
  const nombre = `E2E-QA31-${Date.now()}`;

  test('QA-31 sugerir un lugar por dirección y por ubicación actual; ADM ve la dirección', async ({ browser }) => {
    test.info().annotations.push({ type: 'nota', description: 'Nominatim y la ubicación del dispositivo están simulados.' });

    await conU1EnDuoc(browser, async (paginaU1) => {
      const solicitudes = await simularNominatim(paginaU1);
      await paginaU1.goto('/tabs/mapa');
      await paginaU1.locator('app-pagina-mapa').getByRole('button', { name: 'Sugerir un lugar' }).click();
      const modal = paginaU1.locator('ion-modal').filter({ visible: true }).filter({ hasText: 'Sugerir un lugar' });
      await expect(modal.locator('.mini-mapa .leaflet-tile-container')).toBeAttached({ timeout: 15_000 });

      await test.step('(a) buscar una dirección: el menú flota sin mover el formulario', async () => {
        const posicionMapa = async () => (await modal.locator('.mini-mapa').boundingBox())!.y;
        const antes = await posicionMapa();
        const buscador = modal.locator('input[type="search"]');
        await buscador.fill('Museo de Bellas Artes');
        const ms = await medir(async () => {
          await buscador.press('Enter');
          await expect(modal.locator('.resultado-direccion')).toHaveCount(2);
        });
        anotarTiempo('Búsqueda de dirección (simulada)', ms);
        expect(await posicionMapa(), 'El menú no debe empujar el mapa').toBe(antes);
        await capturar(paginaU1, 'QA-31 menú de direcciones');

        await modal.locator('.resultado-direccion', { hasText: 'Museo Nacional de Bellas Artes' }).click();
        await expect(modal.locator('.resultado-direccion')).toHaveCount(0);
        await expect(buscador).toHaveValue('Museo Nacional de Bellas Artes, 650, José Miguel de la Barra, Santiago');
        await expect(modal.locator('.coords-seleccionadas')).toContainText('-33.43534, -70.64358');
        await expect(modal.locator('.mini-mapa .pin-sugerido')).toBeVisible();
      });

      await test.step('(b) Escape con el menú abierto cierra solo el menú', async () => {
        const buscador = modal.locator('input[type="search"]');
        await buscador.fill('Bellas Artes');
        await buscador.press('Enter');
        await expect(modal.locator('.resultado-direccion')).toHaveCount(2);
        await buscador.press('Escape');
        await expect(modal.locator('.resultado-direccion')).toHaveCount(0);
        await expect(modal, 'El formulario debe seguir abierto').toBeVisible();
      });

      await test.step('(c) usar la ubicación actual marca el punto y completa la dirección', async () => {
        await modal.getByRole('button', { name: 'Usar mi ubicación actual' }).click();
        await expect(modal.locator('.coords-seleccionadas')).toContainText('-33.49996, -70.61663');
        await expect(modal.locator('input[type="search"]')).toHaveValue(DIRECCION_UBICACION);
        await expect(modal.locator('.mensaje-ubicacion'), 'No se avisa la precisión (decisión del equipo)').toHaveCount(0);
        await capturar(paginaU1, 'QA-31 ubicación actual');
      });

      await test.step('(d) enviar la sugerencia con su dirección', async () => {
        await modal.locator('input[type="text"]').fill(nombre);
        await elegirEnHojaDeAcciones(paginaU1, modal.locator('ion-select'), 'Museo');
        await modal.getByRole('button', { name: 'Enviar sugerencia' }).click();
        await expect(toast(paginaU1, '¡Gracias! Tu sugerencia fue enviada.')).toBeVisible();
      });

      expect(solicitudes.length, 'Todas las consultas a Nominatim deben quedar simuladas').toBeGreaterThanOrEqual(3);
    });

    const { data: sugerencia } = await admin
      .from('lugar_sugerido')
      .select('direccion, latitud, longitud, estado')
      .eq('id_usuario', idU1())
      .eq('nombre', nombre)
      .single();
    expect(sugerencia).toEqual({
      direccion: DIRECCION_UBICACION,
      latitud: DUOC_SAN_JOAQUIN.latitude,
      longitud: DUOC_SAN_JOAQUIN.longitude,
      estado: 'pendiente',
    });

    await test.step('(e) ADM ve la dirección y «Revisar y publicar» la precarga', async () => {
      const contexto = await nuevoContexto(browser, { rol: 'adm' });
      try {
        const paginaAdm = await contexto.newPage();
        await paginaAdm.goto('/admin/gestion-lugares');
        const panel = paginaAdm.locator('app-gestion-lugares');
        await expect(panel.locator('.fila-lugar-admin').first()).toBeVisible({ timeout: 15_000 });
        await panel.locator('ion-segment-button[value="sugerencias"]').click();
        const fila = panel.locator('.fila-sugerencia').filter({ hasText: nombre });
        await expect(fila.locator('.fila-sugerencia-direccion')).toHaveText(DIRECCION_UBICACION);
        await fila.getByRole('button', { name: 'Revisar y publicar' }).click();
        const formulario = paginaAdm.locator('ion-modal').filter({ visible: true }).filter({ hasText: 'Nuevo lugar' });
        await expect(formulario.locator('input[name="direccion"]')).toHaveValue(DIRECCION_UBICACION);
        await capturar(paginaAdm, 'QA-31 revisar y publicar');
      } finally {
        await contexto.close();
      }
    });
    // La sugerencia de U1 la borra el seed en la limpieza (actividad de las cuentas de prueba).
  });
});
