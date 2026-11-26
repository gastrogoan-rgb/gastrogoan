# Checklist antes de empezar a vender (miércoles 25/11 → lunes 30/11)

Marca `[x]` al terminar. «Yo» = Claude; «Juntos» = lo hacemos a la vez porque hacen falta tus cuentas.

## Yo (miércoles a viernes)
- [x] Terminar la tanda 2 del Plan 360, pasar la batería completa y publicar con sello de versión (26/11/2026 15:33, en `main`).
- [x] **Revisión de seguridad con mentalidad de atacante** (hecha y publicada el 26/11: CSP, filtro de bots, aforo con autocuración, `PUENTE_CLAVE`, Worker por dueño, `tenantLookup`) (encadenando fallos pequeños). Objetivos: leer las reservas de otro negocio · usar la app sin pagar licencia · entrar como dueño de una cuenta ajena · bloquear la web de reservas de otro negocio. Cada hallazgo con una prueba que lo reproduzca y se corrige solo lo real. `tenantLookup` ya se corrigió (25/11).
- [ ] (Pendiente, yo) Herramientas automáticas: gitleaks (claves olvidadas), Semgrep, `npm audit`, y cabeceras de los tres dominios (securityheaders.com, SSL Labs).
- [x] Cambiar el cifrado débil del PIN (H3, con migración perezosa; publicado el 26/11).
- [ ] Segunda IA distinta (Gemini o ChatGPT) revisando el repositorio con los mismos objetivos de atacante. **Lo lanzas tú**, es público.
- [ ] Guía del sistema para ti (`docs/GUIA-PARA-EL-DUENO.md`) y plan de copias y recuperación (ver abajo).

## Juntos
- [ ] **Más adelante, juntos con delivery:** cobro automático del Plan 360 (950 € + IVA, o 475 € al firmar y 475 € el día 15): enlace de pago de Stripe, confirmación apuntada en `plan360Servicio.cobros360`, aviso en la agenda. Hace falta tu cuenta de Stripe y pegar el Worker a mano en Cloudflare.
- [ ] Prueba de alta completa de un cliente nuevo en el dominio real (cuenta → código → nube → reglas → web de reservas → pago) con la cuenta de prueba.
- [~] LaLiga: la web de reservas ya sale de un servidor propio en Hetzner (recreado el 26/11, IP 5.222.10.11) con UptimeRobot vigilándolo. Falta el segundo servidor y probarlo en un partido real.
- [x] Reglas de Firebase de la plataforma y del negocio pegadas por el dueño el 26/11. Volver a publicarlas si cambian (las tres copias deben ser idénticas; lo vigila `test/reglas.mjs`).

## Tú
- [ ] Escribir tu DNI en «Mis datos de coach» del panel. El IBAN ya es opcional: el Plan 360º y el mantenimiento se cobran con el enlace de pago de Stripe.
- [ ] Comprobar que el enlace de pago de Stripe de la App funciona y que la web comercial dice 300 € + IVA el primer año.
- [ ] Revisión por un abogado de las condiciones de compra, la política de privacidad, el contrato del Plan 360, el acuerdo de mantenimiento y los borradores RGPD (también su versión en catalán e inglés si la quieres).
- [ ] Soporte: un número de WhatsApp, un horario y el procedimiento si un cliente pierde el PIN (generador de licencias, paso 3).
- [ ] Elegir a los primeros 2 o 3 clientes a los que puedas llamar cada día la primera semana.
- [x] Verificación en dos pasos en tus cuentas (hecha el 26/11).
- [ ] Guardar la copia maestra (ver «Copias» en la guía), apuntar dónde están tus accesos y una segunda persona con acceso de emergencia.
- [ ] **Devolver el cobro de prueba de 0,55 €** en Stripe (el cobro real del 26/11 funcionó: el aviso marcó el pedido como pagado).

## Pruebas reales hechas el 26/11
Reserva en la web publicada · entrada como empleado · cobro real de 0,55 € con aviso de Stripe que marca el pedido pagado · UptimeRobot · verificación en dos pasos · servidor de Hetzner nuevo (y el viejo borrado) · reglas de Firebase pegadas.

## No prometas todavía
- VeriFactu como funcional.
- Pedidos de Glovo, Uber Eats o Just Eat dentro de la app.
- Bizum con Stripe Connect v2 (sin verificar).
- Que no habrá fallos: los primeros días saldrán, y es lo que más mejora la app.

## Lo que añadiría de lo que pedía el informático
Todo lo que pedía en su email ya está cubierto por el dossier salvo esto, que sí aporta:
- [x] **Vigilancia**: UptimeRobot puesto el 26/11 (comprobar que cubre `app.`, `reservas.` y `admin.`).
- [ ] **Marcha atrás**: saber volver a la versión anterior en Cloudflare Pages en dos clics (sin practicar todavía).
- [ ] **Copia del registro de licencias** (`issuedCodes`, `ownerNames`, `codeClaims`): si se pierde, no se puede comprobar ningún código. Exportación mensual desde Firebase, gratuita.
- [x] **Previsión de costes por cliente**: `docs/PREVISION-DE-COSTES.md` (hecho).
- [x] **RGPD**: borradores en `docs/RGPD-CONTRATO-ENCARGADO.md` y `docs/RGPD-REGISTRO-DE-ACTIVIDADES.md`; falta que los revise el abogado.
