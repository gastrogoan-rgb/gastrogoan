#!/usr/bin/env bash
# Toda la batería, EN PARALELO. Las cuatro pruebas grandes son
# independientes entre sí, así que encadenarlas solo servía para esperar:
# unos 20 minutos en serie contra el tiempo de la más lenta en paralelo.
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"
SALIDA="${TMPDIR:-/tmp}/gg_bateria"

# Cuántas pruebas a la vez. Cada una levanta un Chromium con la app entera
# dentro, así que pasarse no acelera nada: hace que se peleen por la memoria y
# empiecen a caducar navegaciones. Se puede subir en una máquina más grande:
#   GG_TANDA=12 bash test/todo.sh
TANDA="${GG_TANDA:-6}"
lanzar(){  # espera a que haya hueco antes de arrancar la siguiente
  while [ "$(jobs -rp | wc -l)" -ge "$TANDA" ]; do sleep 1; done
}
rm -rf "$SALIDA"; mkdir -p "$SALIDA"

limpiar(){ [ -n "${PID_WEB:-}" ] && kill "$PID_WEB" 2>/dev/null; }
trap limpiar EXIT

# 1. Sintaxis: instantáneo, y si falla no merece la pena seguir.
for f in js/*.js; do
  node -c "$f" || { echo "❌ sintaxis en $f"; exit 1; }
done
echo "✅ sintaxis (todos los ficheros)"

# 2. Servidor para las pruebas de navegador
( python3 -m http.server 8950 >/dev/null 2>&1 ) & PID_WEB=$!
sleep 2

# 3. Las cuatro grandes, a la vez
lanzar; node test/smoke.test.mjs           > "$SALIDA/smoke.txt"   2>&1 & P1=$!
lanzar; node test/audit-active.mjs         > "$SALIDA/sync.txt"    2>&1 & P2=$!
lanzar; node test/click-audit.mjs          > "$SALIDA/botones.txt" 2>&1 & P3=$!
lanzar; node test/visual-audit.mjs         > "$SALIDA/visual.txt"  2>&1 & P4=$!
lanzar; node test/visual-defectos.mjs      > "$SALIDA/defectos.txt" 2>&1 & P5=$!
lanzar; node test/contraste.mjs            > "$SALIDA/contraste.txt" 2>&1 & P6=$!
lanzar; node test/publica-visual.mjs       > "$SALIDA/publica.txt"  2>&1 & P7=$!
lanzar; node test/extremos.mjs             > "$SALIDA/extremos.txt" 2>&1 & P8=$!
lanzar; node test/recorridos.mjs           > "$SALIDA/recorridos.txt" 2>&1 & P9=$!
lanzar; node test/pestanas.mjs             > "$SALIDA/pestanas.txt"  2>&1 & P10=$!
lanzar; node test/acceso-alta.mjs          > "$SALIDA/acceso.txt"    2>&1 & P11=$!
lanzar; node test/idiomas.mjs              > "$SALIDA/idiomas.txt"   2>&1 & P12=$!
lanzar; node test/transversales.mjs        > "$SALIDA/transv.txt"    2>&1 & P13=$!
lanzar; node test/modales.mjs              > "$SALIDA/modales.txt"   2>&1 & P14=$!
lanzar; node test/pantallas-vacias.mjs     > "$SALIDA/vacias.txt"    2>&1 & P15=$!
lanzar; node test/publica-volumen.mjs      > "$SALIDA/volumen.txt"   2>&1 & P16=$!
lanzar; node test/formularios.mjs          > "$SALIDA/formularios.txt" 2>&1 & P17=$!
lanzar; node test/errores.mjs             > "$SALIDA/errores.txt"     2>&1 & P18=$!
lanzar; node test/bebidas.mjs             > "$SALIDA/bebidas.txt"     2>&1 & P19=$!
lanzar; node test/idr.mjs                 > "$SALIDA/idr.txt"         2>&1 & P20=$!
lanzar; node test/alergenos.mjs           > "$SALIDA/alergenos.txt"   2>&1 & P21=$!
lanzar; node test/i18n-paridad.mjs        > "$SALIDA/i18n.txt"        2>&1 & P22=$!
lanzar; node test/estatico.mjs            > "$SALIDA/estatico.txt"    2>&1 & P23=$!
lanzar; node test/modales-todas.mjs        > "$SALIDA/modtodas.txt"    2>&1 & P24=$!
lanzar; node test/dinero.mjs               > "$SALIDA/dinero.txt"      2>&1 & P25=$!
lanzar; node test/sin-salida.mjs           > "$SALIDA/sinsalida.txt"   2>&1 & P26=$!
lanzar; node test/cuentas.mjs              > "$SALIDA/cuentas.txt"     2>&1 & P27=$!
lanzar; node test/version.mjs              > "$SALIDA/version.txt"     2>&1 & P28=$!
lanzar; node test/escala.mjs               > "$SALIDA/escala.txt"      2>&1 & P29=$!
lanzar; node test/enlaces-publicos.mjs     > "$SALIDA/enlaces.txt"     2>&1 & P30=$!
lanzar; node test/generador.mjs            > "$SALIDA/generador.txt"   2>&1 & P31=$!
lanzar; node test/demo.mjs                 > "$SALIDA/demo.txt"       2>&1 & P32=$!
lanzar; node test/visual-real.mjs          > "$SALIDA/visualreal.txt" 2>&1 & P33=$!
lanzar; node test/traducciones.mjs         > "$SALIDA/traduce.txt"    2>&1 & P34=$!
lanzar; node test/permisos.mjs             > "$SALIDA/permisos.txt"   2>&1 & P35=$!
lanzar; node test/apple.mjs                > "$SALIDA/apple.txt"      2>&1 & P36=$!
lanzar; node test/puesta.mjs               > "$SALIDA/puesta.txt"     2>&1 & P37=$!
lanzar; node test/categorias.mjs           > "$SALIDA/categorias.txt" 2>&1 & P38=$!
lanzar; node test/reglas.mjs               > "$SALIDA/reglas.txt" 2>&1 & P39=$!
lanzar; node test/fallos.mjs               > "$SALIDA/fallos.txt" 2>&1 & P40=$!
lanzar; node test/idr-ficha.mjs            > "$SALIDA/idrficha.txt" 2>&1 & P41=$!
lanzar; node test/conexiones.mjs           > "$SALIDA/conexiones.txt" 2>&1 & P42=$!
lanzar; node test/categorias-ingrediente-seed.mjs > "$SALIDA/catingseed.txt" 2>&1 & P43=$!
lanzar; node test/limpieza-ux.mjs           > "$SALIDA/limpiezaux.txt" 2>&1 & P44=$!
lanzar; node test/email-reservas.mjs        > "$SALIDA/emailreservas.txt" 2>&1 & P45=$!
lanzar; node test/calendario-reservas.mjs   > "$SALIDA/calendario.txt" 2>&1 & P46=$!
lanzar; node test/carrera-sync-carta.mjs    > "$SALIDA/carrerasync.txt" 2>&1 & P49=$!
lanzar; node test/carrera-sync-employees.mjs > "$SALIDA/carrerasyncemp.txt" 2>&1 & P50=$!
lanzar; node test/carrera-sync-dinero.mjs    > "$SALIDA/carrerasyncdinero.txt" 2>&1 & P51=$!
lanzar; node test/horario-fijo.mjs           > "$SALIDA/horariofijo.txt" 2>&1 & P52=$!
lanzar; node test/confirmacion-pedido-reserva.mjs > "$SALIDA/confirmacion.txt" 2>&1 & P47=$!
lanzar; node test/aviso-cambio-reserva.mjs  > "$SALIDA/avisocambio.txt" 2>&1 & P48=$!
lanzar; node test/pedido-solicitud.mjs      > "$SALIDA/pedidosolicitud.txt" 2>&1 & P53=$!
lanzar; node test/aviso-cancelar-pedido.mjs > "$SALIDA/avisocancelarpedido.txt" 2>&1 & P54=$!
lanzar; node test/separacion-areas-personal.mjs > "$SALIDA/separacionareas.txt" 2>&1 & P55=$!
lanzar; node test/stock-empleados.mjs > "$SALIDA/stockempleados.txt" 2>&1 & P56=$!
lanzar; node test/cocina-paso-atras.mjs > "$SALIDA/cocinapasoatras.txt" 2>&1 & P57=$!
lanzar; node test/menu-header-comanda.mjs > "$SALIDA/menuheader.txt" 2>&1 & P58=$!
lanzar; node test/editar-modificadores.mjs > "$SALIDA/editarmods.txt" 2>&1 & P59=$!
lanzar; node test/menu-carta-header-cocina.mjs > "$SALIDA/menucartacocina.txt" 2>&1 & P60=$!
lanzar; node test/sala-cabecera-mesa.mjs > "$SALIDA/salacabecera.txt" 2>&1 & P61=$!
lanzar; node test/codigo-negocio-recordado.mjs > "$SALIDA/codigorecordado.txt" 2>&1 & P62=$!
lanzar; node test/distribucion-volver-equipo.mjs > "$SALIDA/distvolver.txt" 2>&1 & P63=$!
lanzar; node test/manual-indice-fijo.mjs > "$SALIDA/manualindice.txt" 2>&1 & P64=$!
lanzar; node test/ge-ventas-propinas-tipo.mjs > "$SALIDA/geventastipo.txt" 2>&1 & P65=$!

echo "→ 47 pruebas, de $TANDA en $TANDA…"
FALLOS=0
espera(){ # pid, nombre, fichero, patrón de éxito
  # ⚠️ El patrón NO puede llevar el número de casos a pelo ("los 10 casos
  #    pasaron"): añadir un caso a una prueba hacía que la batería cantara
  #    fallo aunque los hubiera pasado TODOS. Un banco que se queja porque
  #    escribes más pruebas es un banco que enseña a ignorarlo.
  wait "$1"
  if grep -qE "$4" "$3" 2>/dev/null; then echo "✅ $2"
  else echo "❌ $2 — ver $3"; tail -6 "$3"; FALLOS=1; fi
}
espera $P1 "cálculos (dinero, IVA, stock, recetas)" "$SALIDA/smoke.txt"   "✅ Todo OK"
espera $P2 "sincronización"                          "$SALIDA/sync.txt"    "Todas las pruebas activas"
espera $P3 "botones (275 en 31 pantallas)"           "$SALIDA/botones.txt" "Ninguno lanzó un error"
espera $P4 "responsive (6 tamaños × 25 vistas)"      "$SALIDA/visual.txt"  "Sin desbordamientos"
espera $P5 "defectos visuales (móvil/tablet/escritorio)" "$SALIDA/defectos.txt"  "nada que señalar"
espera $P6 "contraste del texto"                      "$SALIDA/contraste.txt" "contraste suficiente"
espera $P7 "web pública (3 pantallas)"                "$SALIDA/publica.txt"   "se ve bien"
espera $P8 "contenido extremo"                        "$SALIDA/extremos.txt"  "aguanta contenido largo"
espera $P9  "recorridos completos (de ingrediente a factura)" "$SALIDA/recorridos.txt" "recorridos completos pasaron"
espera $P10 "84 pestañas internas"                    "$SALIDA/pestanas.txt"  "nada que señalar"
espera $P11 "acceso y alta del negocio"               "$SALIDA/acceso.txt"    "nada que señalar"
espera $P12 "catalán e inglés"                        "$SALIDA/idiomas.txt"   "nada que señalar"
espera $P13 "cabecera, chat y ayuda"                  "$SALIDA/transv.txt"    "nada que señalar"
espera $P14 "ventanas emergentes"                     "$SALIDA/modales.txt"   "se comportan bien"
espera $P15 "pantallas vacías"                        "$SALIDA/vacias.txt"    "se comportan bien"
espera $P16 "web pública con carta grande"            "$SALIDA/volumen.txt"   "aguanta una carta grande"
espera $P17 "formularios: rellenar y guardar de verdad" "$SALIDA/formularios.txt" "casos pasaron"
espera $P18 "caminos de error (lo que debe rechazar)"    "$SALIDA/errores.txt"     "casos pasaron"
espera $P19 "fichas de bebida (sala)"                  "$SALIDA/bebidas.txt"     "casos pasaron"
espera $P20 "I+D (platos, menús y cartas)"             "$SALIDA/idr.txt"         "casos pasaron"
espera $P21 "alérgenos: de la ficha al registro APPCC"   "$SALIDA/alergenos.txt"   "casos pasaron"
espera $P22 "los tres idiomas, clave a clave"          "$SALIDA/i18n.txt"        "casos pasaron"
espera $P23 "auditoría en frío del código"              "$SALIDA/estatico.txt"    "casos pasaron"
espera $P24 "las 73 ventanas emergentes, una a una"     "$SALIDA/modtodas.txt"    "se comportan bien"
espera $P25 "el dinero, función por función"           "$SALIDA/dinero.txt"      "casos pasaron"
espera $P26 "callejones sin salida del alta"          "$SALIDA/sinsalida.txt"   "casos pasaron"
espera $P27 "aislamiento entre cuentas"                "$SALIDA/cuentas.txt"     "casos pasaron"
espera $P28 "aviso de version nueva y ahorro de trafico"  "$SALIDA/version.txt"     "casos pasaron"
espera $P29 "escala: nada crece con el numero de clientes" "$SALIDA/escala.txt"      "casos pasaron"
espera $P30 "los enlaces de la web publica (QR y nombre corto)" "$SALIDA/enlaces.txt"     "casos pasaron"
espera $P31 "el generador: emitir y ANULAR licencias"     "$SALIDA/generador.txt"   "casos pasaron"
espera $P32 "la demo (datos creibles y sin asistentes)"    "$SALIDA/demo.txt"       "casos pasaron"
espera $P33 "visual real en PC, tablet y movil"        "$SALIDA/visualreal.txt" "Nada que señalar"
espera $P34 "traducciones (es/ca/en, 41 pantallas)"    "$SALIDA/traduce.txt"    "se puede usar en los tres idiomas"
espera $P35 "los 6 modos de sesion (empleado, edicion, reparto)" "$SALIDA/permisos.txt" "los [0-9]+ casos pasaron"
espera $P36 "iPhone y iPad (trampas de Safari)"        "$SALIDA/apple.txt"     "los [0-9]+ casos pasaron"
espera $P37 "la puesta a punto del negocio"            "$SALIDA/puesta.txt"    "los [0-9]+ casos pasaron"
espera $P38 "renombrar y borrar carpetas"              "$SALIDA/categorias.txt" "los [0-9]+ casos pasaron"
espera $P39 "las reglas de Firebase, coherentes"        "$SALIDA/reglas.txt"     "los [0-9]+ casos pasaron"
espera $P40 "informar de un fallo desde la app"        "$SALIDA/fallos.txt"     "los [0-9]+ casos pasaron"
espera $P41 "el I+D engancha su ficha técnica"          "$SALIDA/idrficha.txt"   "casos pasaron"
espera $P42 "conexiones: alérgenos, menús, fidelidad, lápidas" "$SALIDA/conexiones.txt" "casos pasaron"
espera $P43 "categorías de Mega Lista, seleccionables al editar"  "$SALIDA/catingseed.txt" "casos pasaron"
espera $P44 "limpieza: lavado de manos y limpieza puntual"  "$SALIDA/limpiezaux.txt" "casos pasaron"
espera $P45 "email de reservas: mensaje y aviso al modificar"  "$SALIDA/emailreservas.txt" "casos pasaron"
espera $P46 "calendario interactivo de reservas"  "$SALIDA/calendario.txt" "casos pasaron"
espera $P47 "página de confirmación unificada"  "$SALIDA/confirmacion.txt" "casos pasaron"
espera $P48 "avisar al cliente al cancelar/editar una reserva"  "$SALIDA/avisocambio.txt" "casos pasaron"
espera $P49 "la nube en retraso no deshace ediciones de carta/menú"  "$SALIDA/carrerasync.txt" "casos pasaron"
espera $P50 "la nube en retraso no deshace ediciones de empleados/turnos/fichajes"  "$SALIDA/carrerasyncemp.txt" "casos pasaron"
espera $P51 "dinero: cobro doble y plato reaparecido siguen protegidos"  "$SALIDA/carrerasyncdinero.txt" "casos pasaron"
espera $P52 "horario fijo: patrón semanal que se repite, sin pisar ediciones manuales"  "$SALIDA/horariofijo.txt" "casos pasaron"
espera $P53 "pedir lo que falta: I+D oculto sin edición, solicitud de pedido sin proveedor"  "$SALIDA/pedidosolicitud.txt" "casos pasaron"
espera $P54 "avisar al cliente al cancelar/rechazar un pedido, sin prometer un email que no existe"  "$SALIDA/avisocancelarpedido.txt" "casos pasaron"
espera $P55 "cocina y sala no se mezclan (clima, turnos por desplegable) y el PIN se puede repetir"  "$SALIDA/separacionareas.txt" "casos pasaron"
espera $P56 "stock en modo empleado: cantidad actual editable, mínimo y valor bloqueados"  "$SALIDA/stockempleados.txt" "casos pasaron"
espera $P57 "cocina: un paso atrás en el estado de un plato, incluso ya cerrada la comanda"  "$SALIDA/cocinapasoatras.txt" "casos pasaron"
espera $P58 "el nombre del menú sale una vez por tanda, no repetido en cada plato"  "$SALIDA/menuheader.txt" "casos pasaron"
espera $P59 "editar un modificador/extra ya creado (Carta y Menú)"  "$SALIDA/editarmods.txt" "casos pasaron"
espera $P60 "en Comandas Cocina, menú/carta se dice una vez por tanda, no por plato"  "$SALIDA/menucartacocina.txt" "casos pasaron"
espera $P61 "Sala: Cambiar de mesa sube al principio de la cabecera"  "$SALIDA/salacabecera.txt" "casos pasaron"
espera $P62 "código de negocio recordado en el desplegable, sin autoseleccionar" "$SALIDA/codigorecordado.txt" "casos pasaron"
espera $P63 "Distribución del Trabajo: empleado directo a su ficha, dueño puede volver al equipo" "$SALIDA/distvolver.txt" "casos pasaron"
espera $P64 "Manual: solo el índice de arriba queda fijo al hacer scroll" "$SALIDA/manualindice.txt" "casos pasaron"
espera $P65 "GE Ventas: sin propina en el total, desglose real por tipo de servicio" "$SALIDA/geventastipo.txt" "casos pasaron"

exit $FALLOS
