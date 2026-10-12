import { SupabaseClient } from '@supabase/supabase-js';
import { PREFIJO, correosDePrueba, esCorreoDePrueba } from './entorno';

export type Filtro =
  | { tipo: 'cuentas'; columna: string; ids: string[] }
  | { tipo: 'prefijo'; columna: 'nombre' | 'descripcion' }
  | { tipo: 'lugaresE2E'; columna: string; ids: string[] };

export interface Operacion {
  tabla: string;
  accion: 'delete' | 'update';
  filtro: Filtro;
  cambios?: Record<string, unknown>;
  ademas?: Record<string, string | number | boolean>;
}

export interface Resultado {
  tabla: string;
  accion: Operacion['accion'];
  filas: number;
}

const RUTA_PUBLICA_LUGARES = '/storage/v1/object/public/lugares/';
const NOMBRE_ARCHIVO_APP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i;

export class GuardDatos {
  private constructor(
    private readonly admin: SupabaseClient,
    private readonly cuentas: Set<string>,
    private readonly dryRun: boolean
  ) {}

  static async crear(admin: SupabaseClient, dryRun = false): Promise<GuardDatos> {
    const { data, error } = await admin
      .from('usuario')
      .select('id_usuario, email')
      .in('email', correosDePrueba());
    if (error) throw error;
    const ids = (data ?? []).filter((u) => esCorreoDePrueba(u.email)).map((u) => u.id_usuario as string);
    return new GuardDatos(admin, new Set(ids), dryRun);
  }

  get idsCuentas(): string[] {
    return [...this.cuentas];
  }

  async autorizarCuenta(idUsuario: string): Promise<void> {
    const { data, error } = await this.admin.auth.admin.getUserById(idUsuario);
    if (error) throw error;
    if (!esCorreoDePrueba(data.user?.email)) {
      throw new Error(`Guard: la cuenta ${idUsuario} no es una cuenta de prueba.`);
    }
    this.cuentas.add(idUsuario);
  }

  async ejecutar(operacion: Operacion): Promise<Resultado> {
    const { tabla, accion, filtro, cambios, ademas } = operacion;
    if (!filtro) throw new Error(`Guard: ${accion} en ${tabla} sin filtro.`);
    if (accion === 'update' && (!cambios || !Object.keys(cambios).length)) {
      throw new Error(`Guard: update en ${tabla} sin cambios.`);
    }
    await this.validarFiltro(filtro);
    if (accion === 'update' && filtro.tipo === 'prefijo' && filtro.columna in cambios!) {
      const nuevo = String(cambios![filtro.columna] ?? '');
      if (!nuevo.startsWith(PREFIJO)) throw new Error(`Guard: el update quitaría el prefijo ${PREFIJO}.`);
    }

    const columnas = filtro.columna;
    const previas = await this.aplicar(this.admin.from(tabla).select(columnas), filtro, ademas);
    if (previas.error) throw previas.error;
    const filasPrevias = (previas.data ?? []) as unknown as Record<string, unknown>[];
    this.verificarFilas(tabla, filtro, filasPrevias);

    if (this.dryRun || !filasPrevias.length) {
      return { tabla, accion, filas: filasPrevias.length };
    }

    const base = accion === 'delete' ? this.admin.from(tabla).delete() : this.admin.from(tabla).update(cambios!);
    const ejecutada = await this.aplicar(base, filtro, ademas).select(columnas);
    if (ejecutada.error) throw ejecutada.error;
    const afectadas = (ejecutada.data ?? []) as unknown as Record<string, unknown>[];
    this.verificarFilas(tabla, filtro, afectadas);
    if (afectadas.length !== filasPrevias.length) {
      throw new Error(
        `Guard: ${accion} en ${tabla} afectó ${afectadas.length} filas y se esperaban ${filasPrevias.length}.`
      );
    }
    return { tabla, accion, filas: afectadas.length };
  }

  async borrarCuentaAuth(idUsuario: string, protegidas: string[]): Promise<boolean> {
    const { data, error } = await this.admin.auth.admin.getUserById(idUsuario);
    if (error) throw error;
    const email = data.user?.email?.toLowerCase();
    if (!esCorreoDePrueba(email)) throw new Error(`Guard: ${idUsuario} no es una cuenta de prueba.`);
    if (protegidas.includes(email!)) throw new Error(`Guard: la cuenta ${email} está protegida.`);
    if (this.dryRun) return false;
    const borrado = await this.admin.auth.admin.deleteUser(idUsuario);
    if (borrado.error) throw borrado.error;
    return true;
  }

  async borrarArchivosLugares(rutas: string[]): Promise<number> {
    const unicas = [...new Set(rutas)];
    if (!unicas.length) return 0;
    for (const ruta of unicas) {
      if (!NOMBRE_ARCHIVO_APP.test(ruta)) throw new Error(`Guard: ruta de Storage inesperada (${ruta}).`);
      const { data, error } = await this.admin
        .from('lugar')
        .select('nombre')
        .like('url_imagen_principal', `%${RUTA_PUBLICA_LUGARES}${ruta}`);
      if (error) throw error;
      const ajenos = (data ?? []).filter((l) => !String(l.nombre).startsWith(PREFIJO));
      if (ajenos.length) throw new Error(`Guard: ${ruta} la usa un lugar real (${ajenos[0].nombre}).`);
    }
    if (this.dryRun) return unicas.length;
    const { error } = await this.admin.storage.from('lugares').remove(unicas);
    if (error) throw error;
    return unicas.length;
  }

  static rutaDesdeUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const indice = url.indexOf(RUTA_PUBLICA_LUGARES);
    return indice === -1 ? null : url.substring(indice + RUTA_PUBLICA_LUGARES.length);
  }

  private async validarFiltro(filtro: Filtro): Promise<void> {
    if (filtro.tipo === 'cuentas') {
      if (!filtro.ids.length) throw new Error('Guard: filtro por cuentas sin ids.');
      const ajenas = filtro.ids.filter((id) => !this.cuentas.has(id));
      if (ajenas.length) throw new Error(`Guard: ${ajenas.join(', ')} no son cuentas de prueba.`);
    } else if (filtro.tipo === 'lugaresE2E') {
      if (!filtro.ids.length) throw new Error('Guard: filtro por lugares sin ids.');
      const { data, error } = await this.admin.from('lugar').select('id_lugar, nombre').in('id_lugar', filtro.ids);
      if (error) throw error;
      const validos = (data ?? []).filter((l) => String(l.nombre).startsWith(PREFIJO));
      if (validos.length !== new Set(filtro.ids).size) {
        throw new Error(`Guard: algún lugar del filtro no existe o no empieza con ${PREFIJO}.`);
      }
    } else if (filtro.tipo !== 'prefijo') {
      throw new Error('Guard: tipo de filtro desconocido.');
    }
  }

  private aplicar<T extends { in: Function; like: Function; eq: Function }>(
    consulta: T,
    filtro: Filtro,
    ademas?: Operacion['ademas']
  ): T {
    let resultado: any =
      filtro.tipo === 'prefijo'
        ? consulta.like(filtro.columna, `${PREFIJO}%`)
        : consulta.in(filtro.columna, filtro.ids);
    for (const [columna, valor] of Object.entries(ademas ?? {})) resultado = resultado.eq(columna, valor);
    return resultado;
  }

  private verificarFilas(tabla: string, filtro: Filtro, filas: Record<string, unknown>[]): void {
    const cumple = (fila: Record<string, unknown>) => {
      const valor = fila[filtro.columna];
      if (filtro.tipo === 'prefijo') return typeof valor === 'string' && valor.startsWith(PREFIJO);
      if (filtro.tipo === 'cuentas') return this.cuentas.has(String(valor)) && filtro.ids.includes(String(valor));
      return filtro.ids.includes(String(valor));
    };
    const fuera = filas.filter((fila) => !cumple(fila));
    if (fuera.length) {
      throw new Error(`Guard: ${fuera.length} filas de ${tabla} no cumplen el filtro de datos de prueba.`);
    }
  }
}
