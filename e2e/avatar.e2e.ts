import { Locator, Page } from '@playwright/test';
import { expect, test } from './support/test';
import { credenciales, rutaEstado, variable } from './support/entorno';
import { anotarTiempo, capturar, iniciarSesionUI, medir, nuevoContexto, toast } from './support/app';
import { admin, idU1, obtenerGuard } from './support/datos';
import { iniciarSesionApi } from './support/sesion';
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

      // cuerpo-2 está bloqueado sin «Primer paso» (RF-27, QA-21): se avanza a la siguiente pieza.
      if ((await leerAvatar(preview)).cuerpo === 2) {
        await pantalla.getByRole('button', { name: 'Siguiente: Cuerpo' }).click();
      }
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
    });
  });

  // RF-27 (D-06): cuerpo-2 queda bloqueado hasta obtener la medalla «Primer paso».
  test('QA-21 un ítem bloqueado se ve bloqueado y no puede aplicarse', async ({ page, request }) => {
    const { data: medalla, error } = await admin.from('medalla').select('id_medalla').eq('nombre', 'Primer paso').single();
    expect(error).toBeNull();
    const idPrimerPaso = medalla!.id_medalla as string;
    const guard = await obtenerGuard();
    const quitarMedalla = () =>
      guard.ejecutar({
        tabla: 'usuario_medalla',
        accion: 'delete',
        filtro: { tipo: 'cuentas', columna: 'id_usuario', ids: [idU1()] },
        ademas: { id_medalla: idPrimerPaso },
      });
    await quitarMedalla();

    const pantalla = page.locator('app-personalizar-avatar');
    const preview = pantalla.locator('.avatar-preview app-avatar-preview');
    const sello = pantalla.locator('.sello-bloqueo');
    const guardar = pantalla.getByRole('button', { name: 'Guardar cambios' });
    const irACuerpo2 = async () => {
      // Se espera a que cargue la configuración guardada: si no, la carga pisa los cambios (H-20).
      await expect.poll(() => leerAvatar(preview)).toEqual(await avatarEnBase());
      for (let paso = 0; paso < 8 && (await leerAvatar(preview)).cuerpo !== 2; paso++) {
        await pantalla.getByRole('button', { name: 'Siguiente: Cuerpo' }).click();
      }
      expect((await leerAvatar(preview)).cuerpo).toBe(2);
    };

    try {
      await test.step('Sin la medalla: cuerpo-2 se ve bloqueado y no se puede guardar', async () => {
        await page.goto('/perfil/personalizar-avatar');
        await irACuerpo2();
        await expect(sello).toContainText('Bloqueado');
        await expect(pantalla.getByText('Esta pieza se desbloquea con la medalla «Primer paso».')).toBeVisible();
        await expect(guardar).toBeDisabled();
        await capturar(page, 'QA-21 cuerpo-2 bloqueado');
        expect((await avatarEnBase()).cuerpo, 'No debe guardarse la pieza bloqueada').not.toBe(2);
      });

      await test.step('Sin la medalla: la API también rechaza guardar cuerpo-2', async () => {
        const u1 = credenciales('u1');
        const { session } = await iniciarSesionApi(u1.email, u1.password);
        const respuesta = await request.patch(`${variable('SUPABASE_URL')}/rest/v1/usuario?id_usuario=eq.${idU1()}`, {
          headers: {
            apikey: variable('SUPABASE_ANON_KEY'),
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          data: { avatar_cuerpo: 2 },
        });
        expect(respuesta.ok(), 'La base debe rechazar cuerpo-2 sin la medalla').toBe(false);
        expect((await avatarEnBase()).cuerpo).not.toBe(2);
      });

      await test.step('Con la medalla: cuerpo-2 queda disponible y se guarda', async () => {
        const { error: errorMedalla } = await admin
          .from('usuario_medalla')
          .insert({ id_usuario: idU1(), id_medalla: idPrimerPaso });
        expect(errorMedalla).toBeNull();

        await page.goto('/perfil/personalizar-avatar');
        await irACuerpo2();
        await expect(sello).toHaveCount(0);
        await expect(guardar).toBeEnabled();
        await guardar.click();
        await expect(toast(page, 'Avatar guardado')).toBeVisible();
        await capturar(page, 'QA-21 cuerpo-2 desbloqueado');
        expect((await avatarEnBase()).cuerpo).toBe(2);
      });
    } finally {
      // Se deja a U1 como estaba: sin «Primer paso» (la otorga QA-14) y con el cuerpo por defecto.
      await guard.ejecutar({
        tabla: 'usuario',
        accion: 'update',
        cambios: { avatar_cuerpo: 0 },
        filtro: { tipo: 'cuentas', columna: 'id_usuario', ids: [idU1()] },
      });
      await quitarMedalla();
    }
  });
});
