import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { credenciales, esCorreoDePrueba, rutaEstado } from './support/entorno';
import {
  anotarTiempo,
  botonAlerta,
  escribirSecreto,
  iniciarSesionUI,
  medir,
  toast,
} from './support/app';
import { admin, idU1, obtenerGuard } from './support/datos';
import { CuentaQa01, guardarEnCadena, leerDeCadena } from './support/cadena';
import { guardarEstado } from './support/sesion';

const TEXTO_EN_INGLES = /invalid|credentials|password|error|user|email|failed/i;

test.describe('Cuenta creada desde la interfaz', () => {
  test('QA-01 registro con correo nuevo, contraseñas iguales y términos aceptados', async ({ page }) => {
    const email = `culturego.contacto+e2e-${Date.now()}@gmail.com`;
    const password = `E2e-${randomUUID().slice(0, 12)}`;
    expect(esCorreoDePrueba(email)).toBe(true);
    await page.goto('/auth/registro');
    const registro = page.locator('app-registro');
    await registro.getByPlaceholder('Nombre').fill('E2E Registro QA01');
    await registro.getByPlaceholder('Correo electrónico').fill(email);
    await escribirSecreto(registro.getByPlaceholder('Contraseña', { exact: true }), password);
    await escribirSecreto(registro.getByPlaceholder('Confirmar contraseña'), password);
    await registro.locator('ion-checkbox').click();

    const confirmacion = toast(page, 'Te enviamos un correo').or(page.locator('app-pagina-inicio h1'));
    const ms = await medir(async () => {
      await registro.getByRole('button', { name: 'Crear cuenta' }).click();
      await expect(confirmacion.first()).toBeVisible();
    });
    anotarTiempo('Creación de cuenta', ms);
    expect.soft(ms, 'La confirmación del registro debe llegar en ≤ 2 s').toBeLessThanOrEqual(2000);

    await expect
      .poll(async () => (await admin.from('usuario').select('id_usuario').eq('email', email).maybeSingle()).data, {
        message: 'La fila en usuario debe existir',
      })
      .not.toBeNull();
    const { data: fila } = await admin
      .from('usuario')
      .select('id_usuario, terminos_aceptados_en')
      .eq('email', email)
      .single();
    const idCuenta = fila!.id_usuario as string;
    await (await obtenerGuard()).autorizarCuenta(idCuenta);
    guardarEnCadena('qa01', { id: idCuenta, email, password } satisfies CuentaQa01);
    expect(fila!.terminos_aceptados_en, 'Debe registrarse la fecha de aceptación de términos').not.toBeNull();

    const { data: usuarioAuth } = await admin.auth.admin.getUserById(idCuenta);
    if (!usuarioAuth.user?.email_confirmed_at) {
      const { error } = await admin.auth.admin.updateUserById(idCuenta, { email_confirm: true });
      expect(error).toBeNull();
      test.info().annotations.push({
        type: 'nota',
        description: 'El proyecto exige confirmar el correo; se confirmó con la service role para QA-07.',
      });
    }
  });

  test('QA-07 eliminar cuenta: cancelar no cambia nada y confirmar la elimina', async ({ page }) => {
    const cuenta = leerDeCadena<CuentaQa01>('qa01');
    test.skip(!cuenta, 'QA-01 no dejó creada la cuenta que este caso elimina.');
    const { id: idCuenta, email, password } = cuenta!;
    await page.goto('/auth/login');
    await iniciarSesionUI(page, email, password);
    await expect(page).toHaveURL(/\/tabs\/inicio/);

    await page.goto('/perfil/configuracion');
    const configuracion = page.locator('app-configuracion');
    await configuracion.getByRole('button', { name: 'Eliminar cuenta' }).click();
    await botonAlerta(page, 'Cancelar').click();
    await expect(page.locator('ion-alert')).toBeHidden();
    await expect(page).toHaveURL(/\/perfil\/configuracion/);
    expect((await admin.auth.admin.getUserById(idCuenta)).data.user, 'Cancelar no debe eliminar la cuenta').not.toBeNull();
    await page.reload();
    await expect(page.locator('app-configuracion').getByRole('button', { name: 'Eliminar cuenta' })).toBeVisible();
    await expect(page, 'La sesión debe seguir activa').toHaveURL(/\/perfil\/configuracion/);

    await page.locator('app-configuracion').getByRole('button', { name: 'Eliminar cuenta' }).click();
    const ms = await medir(async () => {
      await botonAlerta(page, 'Eliminar mi cuenta').click();
      await expect(page).toHaveURL(/\/tabs\/inicio/);
    });
    anotarTiempo('Eliminación de cuenta', ms);
    expect.soft(ms, 'La cuenta debe eliminarse en ≤ 3 s').toBeLessThanOrEqual(3000);

    const { data: filaUsuario } = await admin.from('usuario').select('id_usuario').eq('id_usuario', idCuenta).maybeSingle();
    expect(filaUsuario, 'La fila en usuario debe desaparecer').toBeNull();
    const { data: auth } = await admin.auth.admin.getUserById(idCuenta);
    expect(auth.user, 'La cuenta debe desaparecer de Authentication').toBeNull();

    await page.goto('/auth/login');
    await iniciarSesionUI(page, email, password);
    await expect(toast(page, 'Correo o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test('QA-02 registro rechazado: correo existente, contraseñas distintas o términos sin aceptar', async ({ page }) => {
  const u1 = credenciales('u1');
  const nuevo = `culturego.contacto+e2e-noreg-${Date.now()}@gmail.com`;
  const clave = `E2e-${randomUUID().slice(0, 12)}`;
  const { count: cuentasAntes } = await admin.from('usuario').select('id_usuario', { count: 'exact', head: true });

  await test.step('(a) correo de U1', async () => {
    await page.goto('/auth/registro');
    const registro = page.locator('app-registro');
    await registro.getByPlaceholder('Nombre').fill('E2E Duplicado');
    await registro.getByPlaceholder('Correo electrónico').fill(u1.email);
    await escribirSecreto(registro.getByPlaceholder('Contraseña', { exact: true }), clave);
    await escribirSecreto(registro.getByPlaceholder('Confirmar contraseña'), clave);
    await registro.locator('ion-checkbox').click();
    await registro.getByRole('button', { name: 'Crear cuenta' }).click();
    const mensaje = toast(page).first();
    await expect(mensaje).toBeVisible();
    expect.soft(await mensaje.textContent(), 'Debe indicar que el correo ya está registrado').toMatch(/ya está registrado/i);
  });

  await test.step('(b) contraseñas distintas', async () => {
    await page.goto('/auth/registro');
    const registro = page.locator('app-registro');
    await registro.getByPlaceholder('Nombre').fill('E2E Distintas');
    await registro.getByPlaceholder('Correo electrónico').fill(nuevo);
    await escribirSecreto(registro.getByPlaceholder('Contraseña', { exact: true }), clave);
    await escribirSecreto(registro.getByPlaceholder('Confirmar contraseña'), `${clave}x`);
    await registro.locator('ion-checkbox').click();
    await expect(registro.getByText('Las contraseñas no coinciden.')).toBeVisible();
    await expect(registro.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
  });

  await test.step('(c) sin aceptar términos', async () => {
    await page.goto('/auth/registro');
    const registro = page.locator('app-registro');
    await registro.getByPlaceholder('Nombre').fill('E2E Sin Terminos');
    await registro.getByPlaceholder('Correo electrónico').fill(nuevo);
    await escribirSecreto(registro.getByPlaceholder('Contraseña', { exact: true }), clave);
    await escribirSecreto(registro.getByPlaceholder('Confirmar contraseña'), clave);
    await expect(registro.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
  });

  const { count: cuentasDespues } = await admin.from('usuario').select('id_usuario', { count: 'exact', head: true });
  expect(cuentasDespues, 'No debe crearse ninguna cuenta').toBe(cuentasAntes);
  const { data: creada } = await admin.from('usuario').select('id_usuario').eq('email', nuevo).maybeSingle();
  expect(creada).toBeNull();
});

test('QA-03 login con contraseña incorrecta en español y luego correcta en ≤ 2 s', async ({ page }) => {
  const u1 = credenciales('u1');
  await page.goto('/auth/login');
  await iniciarSesionUI(page, u1.email, `Incorrecta-${randomUUID().slice(0, 6)}`);
  const mensaje = toast(page).first();
  await expect(mensaje).toBeVisible();
  const texto = (await mensaje.textContent()) ?? '';
  expect(texto).toContain('Correo o contraseña incorrectos.');
  expect(texto, 'El mensaje no debe tener texto técnico en inglés').not.toMatch(TEXTO_EN_INGLES);
  await expect(page).toHaveURL(/\/auth\/login/);

  const { data: perfil } = await admin.from('usuario').select('nombre').eq('id_usuario', idU1()).single();
  const saludo = `${String(perfil!.nombre).split(' ')[0]}!`;
  for (let intento = 1; intento <= 5; intento++) {
    await page.evaluate(() => localStorage.clear());
    await page.goto('/auth/login');
    const login = page.locator('app-login');
    await login.getByPlaceholder('Correo electrónico').fill(u1.email);
    await escribirSecreto(login.getByPlaceholder('Contraseña', { exact: true }), u1.password);
    const ms = await medir(async () => {
      await login.getByRole('button', { name: 'Iniciar sesión' }).click();
      await expect(page.locator('app-pagina-inicio h1')).toHaveText(saludo);
    });
    anotarTiempo(`Inicio de sesión #${intento}`, ms);
    expect.soft(ms, `Inicio de sesión #${intento} debe tardar ≤ 2 s`).toBeLessThanOrEqual(2000);
  }
});

test.describe('Sesión de U1', () => {
  test.use({ storageState: rutaEstado('u1') });

  test('QA-04 la sesión persiste al recargar y al cerrarla Perfil redirige a login', async ({ page }) => {
    try {
      await page.goto('/tabs/perfil');
      const perfil = page.locator('app-pagina-perfil');
      await expect(perfil.locator('h1.nombre-usuario')).toBeVisible();
      const nombre = (await perfil.locator('h1.nombre-usuario').textContent())!.trim();
      await page.reload();
      await expect(page).toHaveURL(/\/tabs\/perfil/);
      await expect(page.locator('app-pagina-perfil h1.nombre-usuario')).toHaveText(nombre);

      await page.locator('app-pagina-perfil').getByRole('button', { name: 'Cerrar sesión' }).click();
      await expect(page).toHaveURL(/\/tabs\/inicio/);
      await page.locator('ion-tab-button[tab="perfil"]').click();
      await expect(page).toHaveURL(/\/auth\/login\?redirectTo=%2Ftabs%2Fperfil$/);
      await expect(page.getByText(nombre).filter({ visible: true }), 'No deben mostrarse datos de U1').toHaveCount(0);
    } finally {
      await guardarEstado('u1');
    }
  });

  test('QA-06 cambiar el nombre en Configuración y abrir los Términos', async ({ page }) => {
    const { data: original } = await admin.from('usuario').select('nombre').eq('id_usuario', idU1()).single();
    const nuevoNombre = `E2EQA06 Renombrado`;
    try {
      await page.goto('/perfil/configuracion');
      const configuracion = page.locator('app-configuracion');
      await configuracion.getByRole('button', { name: 'Editar perfil' }).click();
      const modal = page.locator('ion-modal').filter({ hasText: 'Editar perfil' });
      await modal.locator('input[name="nombre"]').fill(nuevoNombre);
      await modal.getByRole('button', { name: 'Guardar cambios' }).click();
      const ms = await medir(async () => {
        await botonAlerta(page, 'Confirmar').click();
        await expect(toast(page, 'Perfil actualizado.')).toBeVisible();
      });
      anotarTiempo('Cambio de nombre', ms);
      expect.soft(ms, 'El nombre debe guardarse en ≤ 2 s').toBeLessThanOrEqual(2000);

      await page.reload();
      await page.goto('/tabs/perfil');
      await expect(page.locator('app-pagina-perfil h1.nombre-usuario')).toHaveText(nuevoNombre);
      await page.goto('/tabs/inicio');
      await expect(page.locator('app-pagina-inicio h1')).toHaveText('E2EQA06!');

      await page.goto('/perfil/configuracion');
      const msTerminos = await medir(async () => {
        await page.locator('app-configuracion').getByRole('button', { name: 'Términos y condiciones' }).click();
        await expect(page.getByRole('heading', { name: 'Términos de Servicio de CultureGo' })).toBeVisible();
      });
      anotarTiempo('Apertura de Términos', msTerminos);
      expect.soft(msTerminos, 'Los Términos deben abrirse en ≤ 1 s').toBeLessThanOrEqual(1000);
    } finally {
      await (await obtenerGuard()).ejecutar({
        tabla: 'usuario',
        accion: 'update',
        cambios: { nombre: original!.nombre },
        filtro: { tipo: 'cuentas', columna: 'id_usuario', ids: [idU1()] },
      });
    }
  });
});

test.skip(
  'QA-05 recuperación de contraseña por correo',
  { annotation: { type: 'manual', description: 'Requiere abrir el enlace de un correo real.' } },
  async () => {}
);

test('QA-12 redirectTo externo no saca al usuario de la app', async ({ page }) => {
  const u1 = credenciales('u1');
  await page.goto('/auth/login?redirectTo=https://ejemplo.com');
  await iniciarSesionUI(page, u1.email, u1.password);
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'));
  const destino = new URL(page.url());
  expect(destino.origin).toBe('http://localhost:8100');
  test.info().annotations.push({ type: 'nota', description: `Tras el login la app navegó a ${destino.pathname}.` });
});
