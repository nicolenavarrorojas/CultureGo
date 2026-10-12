import { Browser, BrowserContext, Locator, Page, devices, expect, test } from '@playwright/test';
import { BASE_URL, Rol, rutaEstado } from './entorno';

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

export function anotarTiempo(operacion: string, ms: number): void {
  test.info().annotations.push({ type: 'tiempo', description: `${operacion}: ${ms} ms` });
}

export function anotarManual(descripcion: string): void {
  test.info().annotations.push({ type: 'manual', description: descripcion });
}

export function anotarDiferencia(descripcion: string): void {
  test.info().annotations.push({ type: 'diferencia-plan', description: descripcion });
}

export async function medir<T>(accion: () => Promise<T>): Promise<number> {
  const inicio = Date.now();
  await accion();
  return Date.now() - inicio;
}

export async function nuevoContexto(
  browser: Browser,
  opciones: { rol?: Rol; ubicacion?: Coordenadas } = {}
): Promise<BrowserContext> {
  const { defaultBrowserType: _tipo, ...dispositivo } = devices['Pixel 7'];
  return browser.newContext({
    ...dispositivo,
    baseURL: BASE_URL,
    locale: 'es-CL',
    storageState: opciones.rol ? rutaEstado(opciones.rol) : undefined,
    permissions: opciones.ubicacion ? ['geolocation'] : [],
    geolocation: opciones.ubicacion,
  });
}

export async function capturar(page: Page, nombre: string): Promise<void> {
  await test.info().attach(nombre, { body: await page.screenshot(), contentType: 'image/png' });
}

export async function escribirSecreto(campo: Locator, valor: string): Promise<void> {
  await test.step(
    'Escribir valor confidencial',
    async () => {
      await campo.evaluate((elemento, texto) => {
        const input = elemento as HTMLInputElement;
        input.value = texto;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, valor);
    },
    { box: true }
  );
}

export async function iniciarSesionUI(page: Page, email: string, password: string): Promise<void> {
  const login = page.locator('app-login');
  await login.getByPlaceholder('Correo electrónico').fill(email);
  await escribirSecreto(login.getByPlaceholder('Contraseña', { exact: true }), password);
  await login.getByRole('button', { name: 'Iniciar sesión' }).click();
}

export function toast(page: Page, texto?: string | RegExp): Locator {
  const mensajes = page.locator('ion-toast .toast-message').filter({ visible: true });
  return texto ? mensajes.filter({ hasText: texto }) : mensajes;
}

export function botonAlerta(page: Page, texto: string): Locator {
  return page.locator('ion-alert').getByRole('button', { name: texto, exact: true });
}

export async function elegirEnHojaDeAcciones(page: Page, selector: Locator, opcion: string): Promise<void> {
  await selector.click();
  const hoja = page.locator('ion-action-sheet').filter({ visible: true });
  await hoja.locator('button').filter({ hasText: new RegExp(`^\\s*${opcion}\\s*$`) }).click();
  await expect(hoja).toBeHidden();
}

export function exacto(texto: string): RegExp {
  return new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

export function textoContador(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'lugar encontrado' : 'lugares encontrados'}`;
}
