import { writeFileSync } from 'node:fs';
import { SupabaseClient, User } from '@supabase/supabase-js';
import {
  PREFIJO,
  RUTA_SEED_INFO,
  Rol,
  SeedInfo,
  actualizarEnv,
  clienteAdmin,
  credenciales,
  esCorreoDePrueba,
  variable,
} from './support/entorno';
import { GuardDatos, Resultado } from './support/guard';

interface DefinicionLugar {
  nombre: string;
  categoria: string;
  comuna: string;
  es_gratuito: boolean;
  latitud: number;
  longitud: number;
}

const NOMBRES: Record<Rol, string> = { u1: 'E2E Usuario Uno', u2: 'E2E Usuario Dos', adm: 'E2E Admin' };
const AVATAR_POR_DEFECTO = { avatar_cabeza: 0, avatar_ojos: 2, avatar_boca: 6, avatar_cuerpo: 0, id_avatar: null };
const TABLAS_ACTIVIDAD = ['visita', 'resena', 'reporte', 'lugar_sugerido', 'usuario_medalla'];

const L1: DefinicionLugar = {
  nombre: 'E2E-L1',
  categoria: 'Museo',
  comuna: 'Santiago',
  es_gratuito: true,
  latitud: -33.442,
  longitud: -70.654,
};

const LUGARES_BASE: DefinicionLugar[] = [
  { nombre: 'E2E-L2', categoria: 'Teatro', comuna: 'Providencia', es_gratuito: false, latitud: -33.426, longitud: -70.615 },
  { nombre: 'E2E-L3', categoria: 'Biblioteca', comuna: 'Ñuñoa', es_gratuito: true, latitud: -33.456, longitud: -70.597 },
  { nombre: 'E2E-L4', categoria: 'Galería de arte', comuna: 'Santiago', es_gratuito: false, latitud: -33.448, longitud: -70.66 },
  { nombre: 'E2E-L5', categoria: 'Cine', comuna: 'Providencia', es_gratuito: true, latitud: -33.43, longitud: -70.61 },
];

function lugarRelleno(indice: number): DefinicionLugar {
  const numero = String(indice + 1).padStart(2, '0');
  return {
    nombre: `E2E-R${numero}`,
    categoria: 'Edificio patrimonial',
    comuna: indice % 2 ? 'Providencia' : 'Santiago',
    es_gratuito: indice % 3 !== 0,
    latitud: -33.452 - indice * 0.002,
    longitud: -70.64 + (indice % 4) * 0.003,
  };
}

class Bitacora {
  readonly borrar = new Map<string, number>();
  readonly actualizar = new Map<string, number>();
  readonly crear = new Map<string, number>();
  readonly notas: string[] = [];

  registrar(resultado: Resultado) {
    const destino = resultado.accion === 'delete' ? this.borrar : this.actualizar;
    destino.set(resultado.tabla, (destino.get(resultado.tabla) ?? 0) + resultado.filas);
  }

  sumar(destino: Map<string, number>, clave: string, cantidad = 1) {
    destino.set(clave, (destino.get(clave) ?? 0) + cantidad);
  }

  imprimir(dryRun: boolean) {
    const titulo = dryRun ? 'DRY-RUN (no se modificó nada)' : 'Seed ejecutado';
    console.log(`\n=== ${titulo} ===`);
    const tabla = (nombre: string, mapa: Map<string, number>) => {
      console.log(`\n${nombre}:`);
      if (!mapa.size) console.log('  (nada)');
      for (const [clave, valor] of mapa) console.log(`  ${clave.padEnd(34)} ${valor}`);
    };
    tabla(dryRun ? 'Se borraría' : 'Borrado', this.borrar);
    tabla(dryRun ? 'Se actualizaría' : 'Actualizado', this.actualizar);
    tabla(dryRun ? 'Se crearía' : 'Creado', this.crear);
    if (this.notas.length) {
      console.log('\nNotas:');
      for (const nota of this.notas) console.log(`  - ${nota}`);
    }
  }
}

async function listarUsuariosAuth(admin: SupabaseClient): Promise<User[]> {
  const usuarios: User[] = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw error;
    usuarios.push(...data.users);
    if (data.users.length < 1000) return usuarios;
  }
}

async function idPorNombre(admin: SupabaseClient, tabla: 'categoria' | 'comuna', nombre: string): Promise<string> {
  const columna = tabla === 'categoria' ? 'id_categoria' : 'id_comuna';
  const { data, error } = await admin.from(tabla).select(columna).eq('nombre', nombre).single();
  if (error) throw new Error(`No existe ${tabla} "${nombre}": ${error.message}`);
  return (data as Record<string, string>)[columna];
}

async function esperarFilaUsuario(admin: SupabaseClient, id: string): Promise<void> {
  for (let intento = 0; intento < 10; intento++) {
    const { data } = await admin.from('usuario').select('id_usuario').eq('id_usuario', id).maybeSingle();
    if (data) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`El trigger no creó la fila en usuario para ${id}.`);
}

async function limpiar(admin: SupabaseClient, guard: GuardDatos, bitacora: Bitacora, idsUsuarios: string[]) {
  if (idsUsuarios.length) {
    for (const tabla of TABLAS_ACTIVIDAD) {
      bitacora.registrar(
        await guard.ejecutar({ tabla, accion: 'delete', filtro: { tipo: 'cuentas', columna: 'id_usuario', ids: idsUsuarios } })
      );
    }
    bitacora.registrar(
      await guard.ejecutar({
        tabla: 'usuario',
        accion: 'update',
        cambios: AVATAR_POR_DEFECTO,
        filtro: { tipo: 'cuentas', columna: 'id_usuario', ids: idsUsuarios },
      })
    );
  }

  const { data: lugares, error } = await admin
    .from('lugar')
    .select('id_lugar, nombre, url_imagen_principal')
    .like('nombre', `${PREFIJO}%`);
  if (error) throw error;
  const idsLugares = (lugares ?? []).map((l) => l.id_lugar as string);

  if (idsLugares.length) {
    const permitidas = new Set(guard.idsCuentas);
    for (const tabla of ['visita', 'resena', 'reporte']) {
      const { data, error: errorRef } = await admin.from(tabla).select('id_usuario').in('id_lugar', idsLugares);
      if (errorRef) throw errorRef;
      const pendientes = data ?? [];
      const ajenas = pendientes.filter((fila) => !permitidas.has(fila.id_usuario as string));
      if (ajenas.length) {
        throw new Error(`Hay ${ajenas.length} filas de ${tabla} de usuarios reales sobre lugares ${PREFIJO}. Revisa antes de borrar.`);
      }
      const deCuentas = [...new Set(pendientes.map((f) => f.id_usuario as string))].filter(
        (id) => !idsUsuarios.includes(id)
      );
      if (deCuentas.length) {
        bitacora.registrar(
          await guard.ejecutar({
            tabla,
            accion: 'delete',
            filtro: { tipo: 'cuentas', columna: 'id_usuario', ids: deCuentas },
          })
        );
      }
    }

    const rutas = (lugares ?? [])
      .map((l) => GuardDatos.rutaDesdeUrl(l.url_imagen_principal as string | null))
      .filter((r): r is string => !!r);
    bitacora.sumar(bitacora.borrar, 'storage lugares (imágenes E2E-)', await guard.borrarArchivosLugares(rutas));
  }
  bitacora.registrar(await guard.ejecutar({ tabla: 'lugar', accion: 'delete', filtro: { tipo: 'prefijo', columna: 'nombre' } }));

  const protegidas = (['u1', 'u2', 'adm'] as Rol[]).map((rol) => credenciales(rol).email.toLowerCase());
  const sobrantes = (await listarUsuariosAuth(admin)).filter(
    (u) => esCorreoDePrueba(u.email) && !protegidas.includes(u.email!.toLowerCase())
  );
  for (const usuario of sobrantes) {
    await guard.borrarCuentaAuth(usuario.id, protegidas);
    bitacora.sumar(bitacora.borrar, 'auth.users (+e2e sobrantes)');
  }
}

async function asegurarCuentas(
  admin: SupabaseClient,
  bitacora: Bitacora,
  dryRun: boolean
): Promise<Partial<Record<Rol, string>>> {
  const existentes = await listarUsuariosAuth(admin);
  const ids: Partial<Record<Rol, string>> = {};
  for (const rol of ['u1', 'u2', 'adm'] as Rol[]) {
    const { email, password } = credenciales(rol);
    const existente = existentes.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existente) {
      ids[rol] = existente.id;
      bitacora.notas.push(`Cuenta ${rol.toUpperCase()} existente: se reutiliza.`);
      if (!dryRun) {
        const { error } = await admin.auth.admin.updateUserById(existente.id, { password, email_confirm: true });
        if (error) throw error;
      }
    } else {
      bitacora.sumar(bitacora.crear, 'auth.users (U1/U2/ADM)');
      if (!dryRun) {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nombre: NOMBRES[rol], terminos_aceptados: true },
        });
        if (error) throw error;
        ids[rol] = data.user.id;
      }
    }
    if (ids[rol] && !dryRun) await esperarFilaUsuario(admin, ids[rol]!);
  }
  return ids;
}

async function asignarRoles(admin: SupabaseClient, guard: GuardDatos, bitacora: Bitacora, ids: Record<Rol, string>) {
  for (const rol of ['u1', 'u2', 'adm'] as Rol[]) {
    const cambios = { es_admin: rol === 'adm', nombre: NOMBRES[rol] };
    try {
      bitacora.registrar(
        await guard.ejecutar({
          tabla: 'usuario',
          accion: 'update',
          cambios,
          filtro: { tipo: 'cuentas', columna: 'id_usuario', ids: [ids[rol]] },
        })
      );
    } catch (error) {
      const [u1, u2, adm] = (['u1', 'u2', 'adm'] as Rol[]).map((r) => credenciales(r).email);
      console.error(`\nNo se pudo asignar el rol (${(error as Error).message}).`);
      console.error('Ejecuta esta línea en el SQL Editor de Supabase y vuelve a correr el seed:\n');
      console.error(
        `update public.usuario set es_admin = (email = '${adm}') where email in ('${u1}', '${u2}', '${adm}');\n`
      );
      process.exit(1);
    }
  }
  const { data, error } = await admin.from('usuario').select('id_usuario, es_admin').in('id_usuario', Object.values(ids));
  if (error) throw error;
  for (const fila of data ?? []) {
    const esperado = fila.id_usuario === ids.adm;
    if (fila.es_admin !== esperado) {
      throw new Error(`El rol de ${fila.id_usuario} quedó en es_admin=${fila.es_admin}; se esperaba ${esperado}.`);
    }
  }
}

async function elegirMedalla(admin: SupabaseClient): Promise<SeedInfo['medalla']> {
  const { data, error } = await admin
    .from('medalla')
    .select('id_medalla, nombre, cantidad_requerida')
    .is('id_categoria', null)
    .gt('cantidad_requerida', 1)
    .order('cantidad_requerida')
    .limit(1);
  if (error) throw error;
  if (!data?.length) {
    throw new Error('No existe una medalla general (id_categoria null) con cantidad_requerida > 1. Avísale al equipo.');
  }
  return data[0] as SeedInfo['medalla'];
}

async function crearLugares(
  admin: SupabaseClient,
  definiciones: DefinicionLugar[]
): Promise<{ id_lugar: string; nombre: string }[]> {
  const ids = new Map<string, string>();
  const filas = [];
  for (const def of definiciones) {
    const claveCategoria = `categoria:${def.categoria}`;
    const claveComuna = `comuna:${def.comuna}`;
    if (!ids.has(claveCategoria)) ids.set(claveCategoria, await idPorNombre(admin, 'categoria', def.categoria));
    if (!ids.has(claveComuna)) ids.set(claveComuna, await idPorNombre(admin, 'comuna', def.comuna));
    filas.push({
      nombre: def.nombre,
      descripcion: `${PREFIJO}lugar de prueba automatizada`,
      id_categoria: ids.get(claveCategoria),
      id_comuna: ids.get(claveComuna),
      es_gratuito: def.es_gratuito,
      direccion: `${PREFIJO}Dirección de prueba`,
      latitud: def.latitud,
      longitud: def.longitud,
    });
  }
  const { data, error } = await admin.from('lugar').insert(filas).select('id_lugar, nombre');
  if (error) throw error;
  return data as { id_lugar: string; nombre: string }[];
}

export async function ejecutarSeed(dryRun: boolean, soloLimpiar = false): Promise<void> {
  const patron = variable('E2E_EMAIL_PATTERN');
  for (const rol of ['u1', 'u2', 'adm'] as Rol[]) {
    const { email } = credenciales(rol);
    if (!esCorreoDePrueba(email)) throw new Error(`El correo de ${rol.toUpperCase()} no contiene "${patron}".`);
  }

  const admin = clienteAdmin();
  const bitacora = new Bitacora();
  const guard = await GuardDatos.crear(admin, dryRun);

  const { data: filasUsuarios, error } = await admin
    .from('usuario')
    .select('id_usuario, email')
    .in('email', [credenciales('u1').email, credenciales('u2').email]);
  if (error) throw error;
  await limpiar(admin, guard, bitacora, (filasUsuarios ?? []).map((u) => u.id_usuario as string));
  if (soloLimpiar) {
    bitacora.notas.push('Modo --solo-limpiar: no se crean cuentas, lugares ni visitas.');
    bitacora.imprimir(dryRun);
    return;
  }

  const ids = await asegurarCuentas(admin, bitacora, dryRun);
  const medalla = await elegirMedalla(admin);
  const visitasNecesarias = medalla.cantidad_requerida - 1;
  const rellenos = Math.max(0, visitasNecesarias - LUGARES_BASE.length);
  const definiciones = [L1, ...LUGARES_BASE, ...Array.from({ length: rellenos }, (_, i) => lugarRelleno(i))];

  bitacora.notas.push(
    `Medalla elegida: "${medalla.nombre}" (${medalla.cantidad_requerida} lugares). U1 queda con ${visitasNecesarias} lugares visitados.`
  );
  bitacora.sumar(bitacora.crear, `lugar (E2E-L1..L5${rellenos ? ` + ${rellenos} E2E-Rnn` : ''})`, definiciones.length);
  bitacora.sumar(bitacora.crear, 'visita (U1, lugares E2E- ≠ L1)', visitasNecesarias);
  if (dryRun) {
    bitacora.sumar(bitacora.actualizar, 'usuario (es_admin y nombre de U1/U2/ADM)', 3);
    bitacora.notas.push(`L1 = ${L1.nombre} en (${L1.latitud}, ${L1.longitud}), ${L1.categoria}, ${L1.comuna}.`);
    bitacora.imprimir(true);
    return;
  }

  const guardFinal = await GuardDatos.crear(admin);
  const idsCompletos = ids as Record<Rol, string>;
  await asignarRoles(admin, guardFinal, bitacora, idsCompletos);

  const creados = await crearLugares(admin, definiciones);
  const l1 = creados.find((l) => l.nombre === L1.nombre)!;
  const otros = creados.filter((l) => l.id_lugar !== l1.id_lugar).slice(0, visitasNecesarias);
  const haceDosDias = Date.now() - 2 * 24 * 3600 * 1000;
  const { error: errorVisitas } = await admin.from('visita').insert(
    otros.map((l, i) => ({
      id_usuario: idsCompletos.u1,
      id_lugar: l.id_lugar,
      fecha_visita: new Date(haceDosDias + i * 60_000).toISOString(),
    }))
  );
  if (errorVisitas) throw errorVisitas;

  const { data: obtenida } = await admin
    .from('usuario_medalla')
    .select('id_medalla')
    .eq('id_usuario', idsCompletos.u1)
    .eq('id_medalla', medalla.id_medalla);
  if (obtenida?.length) throw new Error(`U1 ya tiene la medalla "${medalla.nombre}" después del seed.`);

  actualizarEnv({
    E2E_U1_ID: idsCompletos.u1,
    E2E_L1_ID: l1.id_lugar,
    E2E_L1_LAT: String(L1.latitud),
    E2E_L1_LNG: String(L1.longitud),
  });
  const info: SeedInfo = { medalla, lugares: creados };
  writeFileSync(RUTA_SEED_INFO, JSON.stringify(info, null, 2) + '\n');
  bitacora.imprimir(false);
}

if (require.main === module) {
  ejecutarSeed(process.argv.includes('--dry-run'), process.argv.includes('--solo-limpiar')).catch((error) => {
    console.error(`\nSeed abortado: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    process.exit(1);
  });
}
