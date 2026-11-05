import { expect, test } from './support/test';
import { credenciales, rutaEstado, variable } from './support/entorno';
import { capturar, toast } from './support/app';
import { admin, idU1 } from './support/datos';
import { iniciarSesionApi } from './support/sesion';

// «Califica la app»: opinión sobre el funcionamiento de la app. Tabla propia
// (calificacion_app), independiente de las reseñas de lugares.
test.describe('Califica la app', () => {
  test.use({ storageState: rutaEstado('u1') });

  test('QA-30 calificar la app, ver la nota al volver, editarla y que otro usuario no pueda leerla', async ({ page, request }) => {
    const COMENTARIO = `E2E- opinión de la app QA-30 ${Date.now()}`;
    const COMENTARIO_EDITADO = `E2E- opinión editada QA-30 ${Date.now()}`;

    const abrirModal = async () => {
      await page.goto('/tabs/perfil');
      await page.locator('app-pagina-perfil').getByRole('button', { name: 'Califica la app' }).click();
      const modal = page.locator('ion-modal').filter({ hasText: '¿Qué te parece CultureGo?' });
      await expect(modal).toBeVisible();
      return modal;
    };

    await test.step('Sin estrellas no se puede enviar; con 4 estrellas y comentario se guarda', async () => {
      const modal = await abrirModal();
      const enviar = modal.getByRole('button', { name: 'Enviar opinión' });
      await expect(enviar, 'Sin calificación no debe poder enviarse').toBeDisabled();

      await modal.getByRole('radio', { name: 'Calificar con 4 estrellas' }).click();
      await modal.locator('textarea').fill(COMENTARIO);
      await enviar.click();
      await expect(toast(page, '¡Gracias por tu opinión!')).toBeVisible();
      await capturar(page, 'QA-30 opinión enviada');

      const { data, error } = await admin
        .from('calificacion_app')
        .select('calificacion, comentario')
        .eq('id_usuario', idU1());
      expect(error).toBeNull();
      expect(data).toEqual([{ calificacion: 4, comentario: COMENTARIO }]);
    });

    await test.step('Al volver se precarga la nota y editarla actualiza la misma fila', async () => {
      const modal = await abrirModal();
      await expect(modal.getByRole('radio', { name: 'Calificar con 4 estrellas' })).toHaveAttribute('aria-checked', 'true');
      await expect(modal.locator('textarea')).toHaveValue(COMENTARIO);

      await modal.getByRole('radio', { name: 'Calificar con 2 estrellas' }).click();
      await modal.locator('textarea').fill(COMENTARIO_EDITADO);
      await modal.getByRole('button', { name: 'Actualizar opinión' }).click();
      await expect(toast(page, '¡Gracias por tu opinión!')).toBeVisible();

      const { data } = await admin
        .from('calificacion_app')
        .select('calificacion, comentario')
        .eq('id_usuario', idU1());
      expect(data, 'Debe existir una sola calificación de U1').toEqual([
        { calificacion: 2, comentario: COMENTARIO_EDITADO },
      ]);
    });

    await test.step('U2 no puede leer ni modificar la calificación de U1 por la API', async () => {
      const u2 = credenciales('u2');
      const { session } = await iniciarSesionApi(u2.email, u2.password);
      const cabeceras = {
        apikey: variable('SUPABASE_ANON_KEY'),
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      };
      const rest = `${variable('SUPABASE_URL')}/rest/v1/calificacion_app`;

      const lectura = await request.get(`${rest}?id_usuario=eq.${idU1()}&select=*`, { headers: cabeceras });
      expect(lectura.ok()).toBe(true);
      expect(await lectura.json(), 'U2 no debe ver la calificación de U1').toEqual([]);

      const edicion = await request.patch(`${rest}?id_usuario=eq.${idU1()}`, {
        headers: cabeceras,
        data: { calificacion: 5 },
      });
      const filasEditadas = edicion.ok() ? ((await edicion.json()) as unknown[]) : [];
      expect(filasEditadas, 'U2 no debe poder editar la calificación de U1').toHaveLength(0);

      const insercion = await request.post(rest, {
        headers: cabeceras,
        data: { id_usuario: idU1(), calificacion: 1 },
      });
      expect(insercion.ok(), 'U2 no debe poder crear una calificación a nombre de U1').toBe(false);

      const { data } = await admin.from('calificacion_app').select('calificacion').eq('id_usuario', idU1());
      expect(data).toEqual([{ calificacion: 2 }]);
    });
  });
});
