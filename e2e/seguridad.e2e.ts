import { expect, test } from './support/test';
import { credenciales, rutaEstado, variable } from './support/entorno';
import { capturar } from './support/app';
import { admin, asegurarRoles, borrarLugaresDePrueba, idCategoria, idComuna, idU1, lugaresPorNombre } from './support/datos';
import { iniciarSesionApi } from './support/sesion';

const NOMBRE_POST = `E2E-QA29-${Date.now()}`;

test.describe('QA-29', () => {
  test.use({ storageState: rutaEstado('adm') });

  test.afterAll(async () => {
    await borrarLugaresDePrueba('E2E-QA29-');
    const roles = await asegurarRoles();
    expect(roles, 'U1 y U2 deben quedar sin rol y ADM con rol').toEqual({ u1: false, u2: false, adm: true });
  });

  test('QA-29 U1 no puede darse rol ni crear lugares por la API y ADM accede al panel', async ({ page, request }) => {
    const u1 = credenciales('u1');
    const { session } = await iniciarSesionApi(u1.email, u1.password);
    const cabeceras = {
      apikey: variable('SUPABASE_ANON_KEY'),
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
    const rest = `${variable('SUPABASE_URL')}/rest/v1`;

    await test.step('PATCH a usuario con es_admin = true', async () => {
      const respuesta = await request.patch(`${rest}/usuario?id_usuario=eq.${idU1()}`, {
        headers: cabeceras,
        data: { es_admin: true },
      });
      const cuerpo = respuesta.ok() ? await respuesta.json() : [];
      const filasConRol = (cuerpo as { es_admin: boolean }[]).filter((fila) => fila.es_admin);
      test.info().annotations.push({
        type: 'nota',
        description: `PATCH usuario: HTTP ${respuesta.status()}, filas con rol devueltas: ${filasConRol.length}.`,
      });
      expect(filasConRol, 'La API no debe devolver filas con el rol asignado').toHaveLength(0);
      const { data } = await admin.from('usuario').select('es_admin').eq('id_usuario', idU1()).single();
      expect(data!.es_admin, 'U1 debe seguir sin rol en la base').toBe(false);
    });

    await test.step('POST a lugar', async () => {
      const respuesta = await request.post(`${rest}/lugar`, {
        headers: cabeceras,
        data: {
          nombre: NOMBRE_POST,
          descripcion: 'E2E- intento de creación sin rol',
          id_categoria: await idCategoria('Museo'),
          id_comuna: await idComuna('Santiago'),
          es_gratuito: true,
          latitud: -33.45,
          longitud: -70.66,
        },
      });
      test.info().annotations.push({ type: 'nota', description: `POST lugar: HTTP ${respuesta.status()}.` });
      expect(respuesta.ok(), 'La API debe rechazar el POST de U1').toBe(false);
      expect(await lugaresPorNombre(NOMBRE_POST), 'El lugar no debe existir').toHaveLength(0);
    });

    // D-05: el rol se asigna desde Supabase (no hay pantalla de usuarios); se verifica que ADM sí accede al panel.
    await test.step('ADM accede al panel de administración', async () => {
      await page.goto('/admin/gestion-lugares');
      const gestion = page.locator('app-gestion-lugares');
      await expect(gestion.locator('.fila-lugar-admin').first()).toBeVisible({ timeout: 15_000 });
      await capturar(page, 'QA-29 panel de ADM');
    });
  });
});
