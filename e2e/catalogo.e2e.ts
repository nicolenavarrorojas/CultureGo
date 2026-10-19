import { Page, expect, test } from '@playwright/test';
import {
  anotarDiferencia,
  anotarManual,
  anotarTiempo,
  elegirEnHojaDeAcciones,
  exacto,
  medir,
  textoContador,
} from './support/app';
import { FiltroConteo, admin, contarLugares, coordenadasL1, idCategoria, idComuna } from './support/datos';

interface LugarCatalogo {
  nombre: string;
  es_gratuito: boolean;
  categoria: { nombre: string } | null;
  comuna: { nombre: string } | null;
}

async function comunaSinCoincidencias(filtro: FiltroConteo): Promise<string> {
  const { data } = await admin.from('comuna').select('id_comuna, nombre');
  for (const comuna of data ?? []) {
    if ((await contarLugares({ ...filtro, id_comuna: comuna.id_comuna as string })) === 0) return comuna.nombre as string;
  }
  throw new Error('No hay una combinación sin coincidencias para probar «sin resultados».');
}

test('QA-08 catálogo: carga, datos de cada lugar, filtros y sin resultados', async ({ page }) => {
  const catalogo = page.locator('app-lista-lugares');
  const contador = catalogo.locator('.contador-resultados');
  const total = await contarLugares();

  await test.step('Animación de carga', async () => {
    await page.route(/\/rest\/v1\/lugar\?/, async (ruta) => {
      await new Promise((r) => setTimeout(r, 1500));
      await ruta.continue();
    });
    await page.goto('/tabs/inicio');
    await page.locator('app-pagina-inicio').getByRole('button', { name: 'Ver todos' }).click();
    await expect(catalogo.locator('ion-skeleton-text').first()).toBeVisible();
    await expect(contador).toHaveText(textoContador(total), { timeout: 15_000 });
    await page.unrouteAll();
  });

  await test.step('Tiempo de carga del catálogo (5 mediciones)', async () => {
    for (let intento = 1; intento <= 5; intento++) {
      await page.goto('/tabs/inicio');
      const verTodos = page.locator('app-pagina-inicio').getByRole('button', { name: 'Ver todos' });
      await expect(verTodos).toBeVisible();
      const ms = await medir(async () => {
        await verTodos.click();
        await expect(contador).toHaveText(textoContador(total), { timeout: 15_000 });
      });
      anotarTiempo(`Carga del catálogo #${intento}`, ms);
      expect.soft(ms, `Carga del catálogo #${intento} debe tardar ≤ 3 s`).toBeLessThanOrEqual(3000);
    }
  });

  await test.step('Cada lugar muestra nombre, tipo, comuna y gratuidad', async () => {
    const { data } = await admin.from('lugar').select('nombre, es_gratuito, categoria(nombre), comuna(nombre)');
    const lugares = new Map(((data ?? []) as unknown as LugarCatalogo[]).map((l) => [l.nombre, l]));
    const tarjetas = catalogo.locator('button.tarjeta-lugar');
    const faltantes: Record<string, string[]> = { tipo: [], comuna: [], gratuidad: [] };
    for (const tarjeta of await tarjetas.all()) {
      const nombre = (await tarjeta.locator('.tarjeta-nombre').textContent())!.trim();
      const texto = (await tarjeta.textContent()) ?? '';
      const lugar = lugares.get(nombre);
      expect(lugar, `La tarjeta "${nombre}" debe existir en la base`).toBeDefined();
      if (!texto.includes(lugar!.categoria?.nombre ?? '∅')) faltantes['tipo'].push(nombre);
      if (!texto.includes(lugar!.comuna?.nombre ?? '∅')) faltantes['comuna'].push(nombre);
      const gratuidad = lugar!.es_gratuito ? /gratis|gratuito/i : /pagado|de pago|pago/i;
      if (!gratuidad.test(texto)) faltantes['gratuidad'].push(nombre);
    }
    expect.soft(faltantes['tipo'], 'Tarjetas que no muestran el tipo').toEqual([]);
    expect.soft(faltantes['comuna'], 'Tarjetas que no muestran la comuna').toEqual([]);
    expect.soft(faltantes['gratuidad'], 'Tarjetas que no muestran su gratuidad').toEqual([]);
  });

  const categoria = 'Edificio patrimonial';
  const filtro: FiltroConteo = { id_categoria: await idCategoria(categoria) };

  await test.step('Filtro por tipo', async () => {
    const esperado = await contarLugares(filtro);
    const ms = await medir(async () => {
      await catalogo.locator('.chips-categoria ion-chip').filter({ hasText: exacto(categoria) }).click();
      await expect(contador).toHaveText(textoContador(esperado));
    });
    anotarTiempo('Filtro del catálogo por tipo', ms);
    expect.soft(ms, 'El filtro por tipo debe aplicarse en ≤ 1 s').toBeLessThanOrEqual(1000);
  });

  await test.step('Filtro por comuna', async () => {
    filtro.id_comuna = await idComuna('Providencia');
    const esperado = await contarLugares(filtro);
    await catalogo.locator('ion-select.select-comuna').click();
    const opcion = page.locator('ion-action-sheet').filter({ visible: true }).locator('button').filter({ hasText: exacto('Providencia') });
    await expect(opcion).toBeVisible();
    const ms = await medir(async () => {
      await opcion.click();
      await expect(contador).toHaveText(textoContador(esperado));
    });
    anotarTiempo('Filtro del catálogo por comuna', ms);
    expect.soft(ms, 'El filtro por comuna debe aplicarse en ≤ 1 s').toBeLessThanOrEqual(1000);
  });

  await test.step('Filtro por gratuidad', async () => {
    filtro.soloGratuitos = true;
    const esperado = await contarLugares(filtro);
    const ms = await medir(async () => {
      await catalogo.locator('ion-chip.chip-gratis').click();
      await expect(contador).toHaveText(textoContador(esperado));
    });
    anotarTiempo('Filtro del catálogo por gratuidad', ms);
    expect.soft(ms, 'El filtro por gratuidad debe aplicarse en ≤ 1 s').toBeLessThanOrEqual(1000);
    const nombres = await catalogo.locator('.tarjeta-nombre').allTextContents();
    expect(nombres.length).toBe(esperado);
  });

  await test.step('Combinación sin coincidencias', async () => {
    const comunaVacia = await comunaSinCoincidencias({ id_categoria: filtro.id_categoria, soloGratuitos: true });
    await elegirEnHojaDeAcciones(page, catalogo.locator('ion-select.select-comuna'), comunaVacia);
    await expect(contador).toHaveText(textoContador(0));
    await expect(catalogo.locator('.estado-vacio')).toBeVisible();
    await expect.soft(catalogo.getByText(/sin resultados/i), 'Debe mostrarse «sin resultados»').toBeVisible({ timeout: 1000 });
    anotarDiferencia(`Sin coincidencias la app muestra: "${(await catalogo.locator('.estado-vacio p').textContent())?.trim()}".`);
  });

  await test.step('Ficha de un lugar desde Inicio en ≤ 3 clics', async () => {
    let clics = 0;
    await page.goto('/tabs/inicio');
    await page.locator('app-pagina-inicio').getByRole('button', { name: 'Ver todos' }).click();
    clics++;
    await catalogo.locator('button.tarjeta-lugar').filter({ hasText: 'E2E-L1' }).click();
    clics++;
    await expect(page.locator('app-detalle-lugar h1')).toHaveText('E2E-L1');
    expect(clics).toBeLessThanOrEqual(3);
  });
});

async function abrirMapa(page: Page): Promise<number> {
  const marcadores = page.locator('app-pagina-mapa .leaflet-marker-icon.pin-lugar');
  const esperado = await contarLugares({ conCoordenadas: true });
  await page.goto('/tabs/inicio');
  await expect(page.locator('app-pagina-inicio h1')).toBeVisible();
  const ms = await medir(async () => {
    await page.locator('ion-tab-button[tab="mapa"]').click();
    await expect(marcadores).toHaveCount(esperado, { timeout: 15_000 });
  });
  return ms;
}

test.describe('Mapa con permiso de ubicación', () => {
  test.use({ permissions: ['geolocation'], geolocation: coordenadasL1() });

  test('QA-09 mapa: marcadores en ≤ 3 s, filtros en < 2 s y aviso sin coincidencias', async ({ page }) => {
    const mapa = page.locator('app-pagina-mapa');
    const marcadores = mapa.locator('.leaflet-marker-icon.pin-lugar');

    const msCarga = await abrirMapa(page);
    anotarTiempo('Carga del mapa', msCarga);
    expect.soft(msCarga, 'Los marcadores deben verse en ≤ 3 s').toBeLessThanOrEqual(3000);

    const total = await contarLugares({ conCoordenadas: true });
    const gratuitos = await contarLugares({ conCoordenadas: true, soloGratuitos: true });
    for (let intento = 1; intento <= 5; intento++) {
      const esperado = intento % 2 ? gratuitos : total;
      const ms = await medir(async () => {
        await mapa.locator('ion-chip.chip-gratis').click();
        await expect(marcadores).toHaveCount(esperado);
        await expect(mapa.locator('.overlay-cargando')).toBeHidden();
      });
      anotarTiempo(`Filtro del mapa #${intento}`, ms);
      expect.soft(ms, `Filtro del mapa #${intento} debe tardar < 2 s`).toBeLessThan(2000);
    }

    const filtro: FiltroConteo = { conCoordenadas: true, soloGratuitos: true, id_categoria: await idCategoria('Teatro') };
    await mapa.locator('.fila-categorias ion-chip').filter({ hasText: exacto('Teatro') }).click();
    await expect(marcadores).toHaveCount(await contarLugares(filtro));
    filtro.soloGratuitos = false;
    await mapa.locator('ion-chip.chip-gratis').click();
    await expect(marcadores).toHaveCount(await contarLugares(filtro));
    const colores = await marcadores.locator('.pin-punto').evaluateAll((pins) =>
      pins.map((pin) => getComputedStyle(pin).backgroundColor)
    );
    expect.soft([...new Set(colores)], 'Los marcadores de Teatro deben usar su color').toEqual(['rgb(193, 98, 45)']);

    filtro.id_comuna = await idComuna('Providencia');
    await elegirEnHojaDeAcciones(page, mapa.locator('ion-select.select-comuna'), 'Providencia');
    await expect(marcadores).toHaveCount(await contarLugares(filtro));

    const comunaVacia = await comunaSinCoincidencias({ conCoordenadas: true, id_categoria: filtro.id_categoria });
    await elegirEnHojaDeAcciones(page, mapa.locator('ion-select.select-comuna'), comunaVacia);
    await expect(marcadores).toHaveCount(0);
    await expect
      .soft(mapa.getByText(/no (encontramos|hay) lugares|sin resultados|ningún lugar/i), 'Sin coincidencias debe mostrarse un aviso')
      .toBeVisible({ timeout: 2000 });
    anotarManual('Comparar la ubicación de dos marcadores con la dirección de esos lugares.');
  });
});

test('QA-10 mapa sin permiso de ubicación: explica el permiso y sigue funcionando', async ({ page, context }) => {
  await context.clearPermissions();
  await page.addInitScript(() => {
    const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    (window as unknown as { __solicitudesUbicacion: number }).__solicitudesUbicacion = 0;
    navigator.geolocation.getCurrentPosition = (exito, error, opciones) => {
      (window as unknown as { __solicitudesUbicacion: number }).__solicitudesUbicacion++;
      original(exito, error, opciones);
    };
  });
  const mapa = page.locator('app-pagina-mapa');
  await abrirMapa(page);

  await expect
    .soft(
      mapa.getByText(/(usamos|necesitamos|usa) (tu )?ubicaci[oó]n|permiso de ubicaci[oó]n|para mostrarte/i),
      'Antes de pedir el permiso debe mostrarse un mensaje que explique su propósito'
    )
    .toBeVisible({ timeout: 3000 });

  await mapa.getByRole('button', { name: 'Ir a mi ubicación' }).click();
  await expect(mapa.locator('.overlay-cargando')).toBeHidden({ timeout: 15_000 });
  const solicitudes = await page.evaluate(() => (window as unknown as { __solicitudesUbicacion: number }).__solicitudesUbicacion);
  test.info().annotations.push({ type: 'nota', description: `Solicitudes de ubicación hechas por la app: ${solicitudes}.` });

  await expect(mapa.locator('.leaflet-marker-icon.pin-lugar')).toHaveCount(await contarLugares({ conCoordenadas: true }));
  await page.mouse.move(200, 500);
  await page.mouse.wheel(0, -300);
  await expect(mapa.locator('.leaflet-marker-icon.pin-lugar').first()).toBeAttached();

  await page.goto('/lugares');
  await expect(page.locator('app-lista-lugares .contador-resultados')).toHaveText(textoContador(await contarLugares()));
});
