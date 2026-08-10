# Notas de seguridad — arquitectura cliente + Firebase por negocio

Última revisión: 10/08/2026, como continuación de la Fase 1 del audit.

Esta app no tiene backend/API/SQL propio: cada negocio usa su propio
proyecto Firebase, y el "modelo de confianza" es que todos los
dispositivos de un mismo negocio (dueño y empleados) son de confianza
física. Con eso en mente, esto es lo que se revisó de las fases 2-11 del
prompt genérico de auditoría que sí aplica a esta arquitectura real:

## 1. Los permisos "owner-only" son solo de interfaz, no de seguridad real

Las reglas de Firebase (`js/core.js`) exigen `auth != null` + el
`tenantId` correcto, pero la autenticación es `signInAnonymously()` — no
distingue dueño de empleado. La clase CSS `owner-only` (usada en
`js/hr.js`, `js/menu.js`, `js/finance.js`...) solo oculta botones; las
funciones que llaman (`deleteTurno()`, `deleteIngredient()`, etc.) siguen
siendo invocables desde la consola del navegador por cualquiera con acceso
físico al dispositivo.

**No es un fallo nuevo ni urgente**: como cada negocio ya asume que sus
propios dispositivos/empleados son de confianza (igual que una caja
registradora física), es un riesgo bajo y coherente con el resto de la
app. Queda anotado por si algún día se quiere un control de acceso más
fino (ej. bloquear a un empleado con acceso al dispositivo pero sin PIN de
turno para que no pueda borrar ventas desde la consola).

## 2. XSS: prácticas mixtas, sin problema confirmado

Hay 216 asignaciones a `innerHTML` en `js/*.js`. Las que se revisaron con
texto libre de usuario (nombres de producto, notas, nombre de cliente) sí
usan `escapeHtml()` correctamente (ej. `js/hr.js:764`, `js/tpv.js:1885`).
No se encontró ningún caso confirmado de texto libre sin escapar. No se
hizo una revisión exhaustiva de los 216 sitios (fuera de alcance de una
sesión), así que esto queda como "sin problema confirmado", no como
"garantizado libre de XSS al 100%".

## 3. Validación de importes: en buen estado

Los inputs de pago/descuento/propina están correctamente protegidos con
`Math.max(0, ...parseFloat(...)||0)` (`js/tpv.js:3174-3391`), y los
decrementos de stock no bajan de 0. No requiere ninguna acción.

## 4. Tests: prácticamente inexistentes

Solo existe `test-3years.mjs` en la raíz del repo — no hay carpeta
`test/` ni script de test en ningún `package.json`. Para una app que
maneja dinero real, unos tests mínimos sobre el cálculo de totales de
venta y decremento de stock aportarían valor como red de seguridad, pero
no se ha priorizado esta noche por ser un cambio de alcance más grande
(decidir framework, cuánto cubrir) que requiere una conversación aparte
con el negocio, no una corrección puntual.

## 5. Rendimiento con negocios de mucho histórico

No se encontraron bucles claramente O(n²) sobre `DB.sales`/`DB.products`
en los renders más habituales. No se revisaron a fondo los paneles de
`finance.js` que recorren todo el histórico de ventas — queda sin
confirmar si escalan bien con años de datos reales, pendiente de revisar
si algún negocio reporta lentitud real.

## Conclusión

De las fases 2-11 del audit genérico, lo único con valor real para esta
arquitectura es el punto 1 (permisos son de interfaz, no de backend) y el
punto 4 (falta de tests). Ninguno de los dos es urgente ni bloqueante: el
resto de fases (RBAC de servidor, multi-tenancy de base de datos
compartida, rate limiting de API, etc.) simplemente no aplican porque no
existe ese tipo de infraestructura en esta app.
