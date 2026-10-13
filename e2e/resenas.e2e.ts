import { Locator, expect, test } from '@playwright/test';
import { rutaEstado } from './support/entorno';
import { nuevoContexto, capturar, toast } from './support/app';
import { admin, idL1, idU1 } from './support/datos';
import { guardarEnCadena, leerDeCadena } from './support/cadena';

const estrellasLlenas = (fila: Locator) =>
  fila
    .locator('.fila-resena-estrellas ion-icon')
    .evaluateAll((iconos) => iconos.filter((icono) => (icono as HTMLElement & { name: string }).name === 'star').length);

test.describe('Reseñas en L1', () => {
  test.use({ storageState: rutaEstado('u1') });

  test('QA-17 reseña incompleta se rechaza, la válida se publica y U2 no puede editarla', async ({ page, browser }) => {
    const COMENTARIO = `E2E- reseña de prueba QA-17 ${Date.now()}`;
    await page.goto(`/lugares/${idL1()}`);
    const detalle = page.locator('app-detalle-lugar');
    const formulario = detalle.locator('.formulario-resena');
    const publicar = formulario.getByRole('button', { name: 'Publicar reseña' });
    await expect(formulario).toContainText('Deja tu reseña');

    await formulario.locator('textarea').fill(COMENTARIO);
    await expect(publicar, 'Sin calificación no debe poder publicarse').toBeDisabled();

    await formulario.locator('textarea').fill('');
    await formulario.getByRole('button', { name: 'Calificar con 4 estrellas' }).click();
    await expect.soft(publicar, 'Con el comentario vacío no debe poder publicarse').toBeDisabled({ timeout: 1000 });

    await formulario.locator('textarea').fill(COMENTARIO);
    await publicar.click();
    await expect(toast(page, '¡Gracias por tu reseña!')).toBeVisible();
    guardarEnCadena('qa17', COMENTARIO);
    const { data: perfil } = await admin.from('usuario').select('nombre').eq('id_usuario', idU1()).single();
    const fila = detalle.locator('.fila-resena').filter({ hasText: COMENTARIO });
    await expect(fila).toContainText(perfil!.nombre as string);
    expect(await estrellasLlenas(fila)).toBe(4);

    const contextoU2 = await nuevoContexto(browser, { rol: 'u2' });
    try {
      const paginaU2 = await contextoU2.newPage();
      await paginaU2.goto(`/lugares/${idL1()}`);
      const filaU2 = paginaU2.locator('app-detalle-lugar .fila-resena').filter({ hasText: COMENTARIO });
      await expect(filaU2).toBeVisible();
      await expect(filaU2.getByRole('button'), 'U2 no debe tener opciones sobre la reseña de U1').toHaveCount(0);
      await expect(paginaU2.locator('app-detalle-lugar .formulario-resena')).toContainText('Deja tu reseña');
      await capturar(paginaU2, 'QA-17 vista de U2');
    } finally {
      await contextoU2.close();
    }
  });

  test('QA-18 editar la reseña propia actualiza la misma fila', async ({ page }) => {
    const COMENTARIO = leerDeCadena<string>('qa17');
    test.skip(!COMENTARIO, 'QA-17 no publicó la reseña que este caso edita.');
    const COMENTARIO_EDITADO = `E2E- reseña editada QA-18 ${Date.now()}`;
    await page.goto(`/lugares/${idL1()}`);
    const formulario = page.locator('app-detalle-lugar .formulario-resena');
    await expect(formulario).toContainText('Tu reseña');
    await formulario.getByRole('button', { name: 'Calificar con 2 estrellas' }).click();
    await formulario.locator('textarea').fill(COMENTARIO_EDITADO);
    await formulario.getByRole('button', { name: 'Actualizar reseña' }).click();
    await expect(toast(page, 'Reseña actualizada.')).toBeVisible();

    await page.reload();
    const fila = page.locator('app-detalle-lugar .fila-resena').filter({ hasText: COMENTARIO_EDITADO });
    await expect(fila).toBeVisible();
    expect(await estrellasLlenas(fila)).toBe(2);
    await expect(page.locator('app-detalle-lugar .fila-resena').filter({ hasText: COMENTARIO! })).toHaveCount(0);

    const { data, error } = await admin
      .from('resena')
      .select('calificacion, comentario')
      .eq('id_usuario', idU1())
      .eq('id_lugar', idL1());
    expect(error).toBeNull();
    expect(data, 'Debe existir una sola reseña de U1 en L1').toHaveLength(1);
    expect(data![0]).toEqual({ calificacion: 2, comentario: COMENTARIO_EDITADO });
  });
});
