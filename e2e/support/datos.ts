import { PREFIJO, clienteAdmin, credenciales, variable } from './entorno';
import { GuardDatos } from './guard';

export const admin = clienteAdmin();

let guard: GuardDatos | null = null;

export async function obtenerGuard(): Promise<GuardDatos> {
  guard ??= await GuardDatos.crear(admin);
  return guard;
}

export const idU1 = () => variable('E2E_U1_ID');
export const idL1 = () => variable('E2E_L1_ID');
export const coordenadasL1 = () => ({
  latitude: Number(variable('E2E_L1_LAT')),
  longitude: Number(variable('E2E_L1_LNG')),
});

export async function idDeCuenta(email: string): Promise<string> {
  const { data, error } = await admin.from('usuario').select('id_usuario').eq('email', email).single();
  if (error) throw error;
  return data.id_usuario as string;
}

export async function idCategoria(nombre: string): Promise<string> {
  const { data, error } = await admin.from('categoria').select('id_categoria').eq('nombre', nombre).single();
  if (error) throw error;
  return data.id_categoria as string;
}

export async function idComuna(nombre: string): Promise<string> {
  const { data, error } = await admin.from('comuna').select('id_comuna').eq('nombre', nombre).single();
  if (error) throw error;
  return data.id_comuna as string;
}

export interface FiltroConteo {
  id_categoria?: string;
  id_comuna?: string;
  soloGratuitos?: boolean;
  conCoordenadas?: boolean;
  nombre?: string;
}

export async function contarLugares(filtro: FiltroConteo = {}): Promise<number> {
  let consulta = admin.from('lugar').select('id_lugar', { count: 'exact', head: true });
  if (filtro.id_categoria) consulta = consulta.eq('id_categoria', filtro.id_categoria);
  if (filtro.id_comuna) consulta = consulta.eq('id_comuna', filtro.id_comuna);
  if (filtro.soloGratuitos) consulta = consulta.eq('es_gratuito', true);
  if (filtro.conCoordenadas) consulta = consulta.not('latitud', 'is', null).not('longitud', 'is', null);
  if (filtro.nombre) consulta = consulta.ilike('nombre', `%${filtro.nombre}%`);
  const { count, error } = await consulta;
  if (error) throw error;
  return count ?? 0;
}

export async function contarVisitas(idUsuario: string, idLugar?: string): Promise<number> {
  let consulta = admin.from('visita').select('id_visita', { count: 'exact', head: true }).eq('id_usuario', idUsuario);
  if (idLugar) consulta = consulta.eq('id_lugar', idLugar);
  const { count, error } = await consulta;
  if (error) throw error;
  return count ?? 0;
}

export async function medallasDe(idUsuario: string): Promise<string[]> {
  const { data, error } = await admin.from('usuario_medalla').select('id_medalla').eq('id_usuario', idUsuario);
  if (error) throw error;
  return (data ?? []).map((fila) => fila.id_medalla as string);
}

export async function lugaresPorNombre(prefijoNombre: string): Promise<{ id_lugar: string; nombre: string }[]> {
  if (!prefijoNombre.startsWith(PREFIJO)) throw new Error(`Solo se buscan lugares ${PREFIJO}.`);
  const { data, error } = await admin.from('lugar').select('id_lugar, nombre').like('nombre', `${prefijoNombre}%`);
  if (error) throw error;
  return (data ?? []) as { id_lugar: string; nombre: string }[];
}

export async function borrarLugaresDePrueba(prefijoNombre: string): Promise<void> {
  const lugares = await lugaresPorNombre(prefijoNombre);
  if (!lugares.length) return;
  await (await obtenerGuard()).ejecutar({
    tabla: 'lugar',
    accion: 'delete',
    filtro: { tipo: 'lugaresE2E', columna: 'id_lugar', ids: lugares.map((l) => l.id_lugar) },
  });
}

export async function crearLugarDePrueba(nombre: string, datos: { categoria: string; comuna: string }) {
  if (!nombre.startsWith(PREFIJO)) throw new Error(`Los lugares de prueba deben empezar con ${PREFIJO}.`);
  const { data, error } = await admin
    .from('lugar')
    .insert({
      nombre,
      descripcion: `${PREFIJO}lugar temporal de prueba`,
      id_categoria: await idCategoria(datos.categoria),
      id_comuna: await idComuna(datos.comuna),
      es_gratuito: true,
      latitud: -33.47,
      longitud: -70.62,
    })
    .select('id_lugar, nombre')
    .single();
  if (error) throw error;
  return data as { id_lugar: string; nombre: string };
}

export async function asegurarRoles(): Promise<Record<'u1' | 'u2' | 'adm', boolean>> {
  const g = await obtenerGuard();
  const esperado = { u1: false, u2: false, adm: true } as const;
  const resultado = {} as Record<'u1' | 'u2' | 'adm', boolean>;
  for (const rol of ['u1', 'u2', 'adm'] as const) {
    const id = await idDeCuenta(credenciales(rol).email);
    const { data, error } = await admin.from('usuario').select('es_admin').eq('id_usuario', id).single();
    if (error) throw error;
    if (data.es_admin !== esperado[rol]) {
      await g.ejecutar({
        tabla: 'usuario',
        accion: 'update',
        cambios: { es_admin: esperado[rol] },
        filtro: { tipo: 'cuentas', columna: 'id_usuario', ids: [id] },
      });
    }
    const { data: final } = await admin.from('usuario').select('es_admin').eq('id_usuario', id).single();
    resultado[rol] = final?.es_admin as boolean;
  }
  return resultado;
}
