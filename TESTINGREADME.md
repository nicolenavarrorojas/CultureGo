# Pruebas de CultureGo

Guía para ejecutar las pruebas del proyecto. Los casos, criterios y resultados esperados están en el Plan de Pruebas (`FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/Plan_de_Pruebas_CultureGo_v2.1.docx`); los resultados se registran en `FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/Registro_Ejecucion_Pruebas_CultureGo.xlsx`.

| Tipo | Casos | Herramienta | Comando | Evidencia |
|---|---|---|---|---|
| Unitarias | UT-* | Karma + Jasmine | `npm test` | `FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/evidencias/ut-ejecucion-AAAA-MM-DD.txt` |
| E2E (QA automatizados) | QA-01 a QA-29 | Playwright Test | `npm run e2e` | `FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/evidencias/e2e-AAAA-MM-DD/` |
| Manuales | QA-01 a QA-29 | A mano, según el plan | — | `FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/evidencias/manual-AAAA-MM-DD/` |

## Requisitos previos

- Node.js y las dependencias instaladas: `npm install`.
- El archivo `src/environments/environment.ts` (no se versiona; pídelo al equipo). Lo necesitan tanto `ng test` como `ionic serve`.

---

## 1. Pruebas unitarias

Viven junto al código, en `src/**/*.spec.ts`, y cada prueba lleva su ID al inicio del nombre (por ejemplo, `UT-AUTH-07`). Todos los servicios de Supabase están simulados: estas pruebas **no** tocan la base de datos.

```bash
# Modo desarrollo: abre Chrome y vuelve a ejecutar al guardar cambios
npm test

# Una sola ejecución, sin ventana, con cobertura
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage
```

La cobertura queda en `coverage/app/index.html` (no se versiona).

Para dejar el log de una ejecución como evidencia:

```bash
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage > "FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/evidencias/ut-ejecucion-AAAA-MM-DD.txt" 2>&1
```

---

## 2. Pruebas E2E con Playwright

Automatizan los casos QA-01 a QA-29 de la sección 4 del plan. Corren sobre la versión web (`ionic serve`, http://localhost:8100) emulando un Pixel 7, y cada prueba lleva el ID del caso al inicio del título. QA-05 queda como manual porque necesita abrir el enlace de un correo real.

> **Importante: se ejecutan contra la base de datos REAL de Supabase.** Solo crean, modifican o borran datos de prueba: cuentas cuyo correo contiene `+e2e`, lugares cuyo nombre empieza con `E2E-` y la actividad de las cuentas de prueba U1, U2 y ADM. Todo borrado o actualización pasa por `GuardDatos` (`e2e/support/guard.ts`), que exige uno de esos filtros, cuenta las filas antes y se detiene si alguna no cumple la condición. Mientras haya datos de prueba cargados, los lugares `E2E-` se ven en el catálogo y en el mapa de la app.

### Configuración (una sola vez)

1. Copia `.env.e2e.example` a `.env.e2e` y completa los valores (URL y claves de Supabase, y correo y contraseña de U1, U2 y ADM). Los tres correos deben contener `+e2e`. Las claves `E2E_U1_ID`, `E2E_L1_ID`, `E2E_L1_LAT` y `E2E_L1_LNG` las completa el seed. `.env.e2e` no se versiona.
2. Instala el navegador:

   ```bash
   npx playwright install chromium
   ```

### Datos de prueba (seed)

`e2e/seed.ts` limpia y recrea los datos de prueba: asegura las cuentas U1, U2 y ADM con su rol, crea `E2E-L1` y los demás lugares `E2E-`, y deja a U1 a un lugar de obtener la medalla general más baja con umbral mayor que 1.

```bash
npm run e2e:seed -- --dry-run                  # muestra qué borraría y crearía, sin cambiar nada
npm run e2e:seed                               # limpia y recrea el set de prueba
npm run e2e:seed -- --solo-limpiar --dry-run   # muestra qué borraría la limpieza
npm run e2e:seed -- --solo-limpiar             # borra lugares E2E- y actividad de prueba; conserva las cuentas
```

Ejecuta siempre primero el `--dry-run`. No hace falta correr el seed antes de las pruebas: el `globalSetup` lo ejecuta en cada corrida.

Si el seed no puede asignar el rol de administrador (trigger `fn_proteger_es_admin`), se detiene y muestra una línea de SQL para ejecutarla en el SQL Editor de Supabase.

### Ejecutar

```bash
npm run e2e                            # todas; levanta ionic serve si no está corriendo
npx playwright test -g "QA-13"         # un caso
npx playwright test e2e/admin.e2e.ts   # un archivo
npx playwright show-report "FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/evidencias/e2e-report" # abre el último reporte
```

- **QA-01 envía un correo real** de confirmación al buzón del equipo (`culturego.contacto+e2e-<timestamp>@gmail.com`). El SMTP incluido en Supabase limita los envíos por hora, así que evita más de una corrida completa por hora. Para repetir casos puntuales, filtra con `-g` y deja fuera a QA-01 y QA-07.
- Las pruebas corren una a la vez (`workers: 1`), porque todas comparten las cuentas de prueba.

### Después de cada corrida

1. Renombra el reporte con la fecha:

   ```bash
   mv "FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/evidencias/e2e-report" "FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/evidencias/e2e-AAAA-MM-DD"
   ```

2. Deja el catálogo limpio: `npm run e2e:seed -- --solo-limpiar`. Si prefieres conservar el set base para la próxima corrida, usa `npm run e2e:seed`.

### Cómo leer el reporte

- **Fail** = el caso no cumple lo esperado. Muchas validaciones son blandas (`expect.soft`): el caso sigue verificando el resto y al final aparece como Fail con todas sus fallas juntas.
- **Anotaciones** de cada prueba:
  - `tiempo`: mediciones del criterio CS-15. Carga del catálogo, filtro del mapa e inicio de sesión se miden 5 veces; creación de cuenta y registro de visita, 1 vez.
  - `manual`: partes del caso que siguen siendo manuales (por ejemplo, la ausencia de destello del tema oscuro).
  - `diferencia-plan`: diferencias entre el plan y la app real.
  - `nota`: datos de contexto, como códigos HTTP o tamaños de archivo.
- **Casos encadenados:** QA-07, QA-15, QA-18 y QA-20 dependen de QA-01, QA-14, QA-17 y QA-19. Si falta su precondición, se omiten con el motivo.
- **Evidencia guardada:** captura de pantalla de cada prueba y video de las que fallan. Las trazas y los snapshots de página están desactivados para no guardar claves ni contraseñas.

### Estructura

```
e2e/
├── *.e2e.ts             pruebas por módulo (auth, catalogo, visitas, resenas, avatar, tema, admin, seguridad)
├── seed.ts              datos de prueba (--dry-run, --solo-limpiar)
├── global-setup.ts      seed + fixtures + sesiones de U1, U2 y ADM
├── global-teardown.ts   borra la cuenta de QA-01 si quedó viva
├── support/             entorno, guard, sesiones, helpers de UI y de datos
├── fixtures/            imagen de ~3,6 MB y PDF para QA-25 (se generan solos; no se versionan)
└── .auth/               sesiones y estado entre casos (no se versiona)
```

Las pruebas usan el sufijo `.e2e.ts` para que Karma, que toma `**/*.spec.ts`, no las incluya.

### Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `Falta la variable … en .env.e2e` | Completa `.env.e2e` a partir de `.env.e2e.example`. |
| `Guard: …` | El guard detuvo una operación que podía tocar datos reales. Revisa el mensaje antes de reintentar. |
| `Hay N filas de … de usuarios reales sobre lugares E2E-` | Un usuario real interactuó con un lugar de prueba. El seed no borra nada; revísalo antes de continuar. |
| QA-01 falla con «demasiados correos» | Límite del SMTP de Supabase. Espera una hora. |
| El puerto 8100 está ocupado | Playwright reutiliza el `ionic serve` que ya esté corriendo; verifica que sea esta app. |

---

## 3. Pruebas manuales

Se ejecutan siguiendo los pasos de la sección 4 del Plan de Pruebas, cada caso a partir de su precondición. Los resultados van al Registro de ejecución (`.xlsx`) y las capturas o videos a `FASE 2/EVIDENCIAS PROYECTO/EVIDENCIAS DE DOCUMENTACION/7- Pruebas y evidencias/evidencias/manual-AAAA-MM-DD/`. Para un Fail, registra una incidencia con lo esperado frente a lo obtenido.

Los casos QA-01 a QA-29 también están automatizados (sección 2). Siguen siendo manuales QA-05 y las partes anotadas como `manual` en el reporte de Playwright.
