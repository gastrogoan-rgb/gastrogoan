# Plan 360° — el coaching, no la app

Un proyecto de Firebase **aparte** del de cada negocio (ver el porqué en
`comun.js`). Dos piezas:

| Carpeta | Quién entra | Con qué |
|---|---|---|
| `panel/` | Marcos | su cuenta de Google (`gastrogoan@gmail.com`), igual que `generador-licencias.html` |
| `cliente/` | el hostelero | usuario + PIN, igual que GastroGoan App |

## Puesta en marcha (una sola vez)

1. **Crear el proyecto** en console.firebase.google.com (gratis).
2. **Realtime Database** → crear, región `europe-west1`, modo bloqueado.
3. **Authentication → Sign-in method** → activar:
   - **Correo electrónico/contraseña** (para el panel — es Marcos, un único admin, mismo patrón que el generador de licencias)
   - **Anónimo** (para que los clientes puedan leer su nodo sin pedirles ni un email)
4. **Authentication → Users → Añadir usuario** → `gastrogoan@gmail.com` + una contraseña. Esa es la que se usa para entrar al panel.
5. **Configuración del proyecto → Tus apps → Añadir app web** → copiar el bloque `firebaseConfig` y pegarlo en `comun.js`, en `COACH_FIREBASE_CONFIG`.
6. **Realtime Database → Reglas** → pegar el contenido de `reglas-coaching.json` → Publicar.

## Cómo se publica

Mismo patrón que `/legal/`: esta carpeta vive dentro del repositorio y
`deploy/actualizar.sh` la copia a `app.gastrogoan.com/plan/`. No hace falta
tocar el DNS ni nada nuevo — solo hay que sumarla al script de despliegue.

## Estado (17/09/2026)

- ✅ `comun.js` — el mecanismo de usuario+PIN, listo
- ✅ `cliente/index.html` — login funcional, pantalla de bienvenida como
  marcador de posición (el checklist, el plan de 30 días y los informes van
  encima de esta misma base)
- ⬜ `panel/` — pendiente: login del coach + listar clientes + dar de alta uno nuevo
- ⬜ El checklist del día 1 (lo que alimenta la nota, el dosier y el plan)
- ⬜ El plan de 30 días con hitos semanales
- ⬜ Los informes mensuales del seguimiento

**No se puede probar de verdad hasta tener la configuración real de
Firebase** (paso 5 de arriba). En cuanto esté, se verifica el login de
punta a punta antes de seguir construyendo contenido encima.
