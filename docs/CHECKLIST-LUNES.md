# Checklist antes de empezar a vender (miércoles 25/11 → lunes 30/11)

Marca `[x]` al terminar. «Yo» = Claude; «Juntos» = lo hacemos a la vez porque hacen falta tus cuentas.

## Yo (miércoles a viernes)
- [ ] Terminar la tanda 2 del Plan 360, pasar la batería completa y publicar con sello de versión.
- [ ] **Revisión de seguridad con mentalidad de atacante** (encadenando fallos pequeños). Objetivos: leer las reservas de otro negocio · usar la app sin pagar licencia · entrar como dueño de una cuenta ajena · bloquear la web de reservas de otro negocio. Cada hallazgo con una prueba que lo reproduzca y se corrige solo lo real. Punto de partida conocido: `tenantLookup` se puede sobrescribir desde cualquier sesión.
- [ ] Herramientas automáticas: gitleaks (claves olvidadas), Semgrep, `npm audit`, y cabeceras de los tres dominios (securityheaders.com, SSL Labs).
- [ ] Cambiar el cifrado débil del PIN (con migración, sin dejar fuera a nadie).
- [ ] Segunda IA distinta (Gemini o ChatGPT) revisando el repositorio con los mismos objetivos de atacante. **Lo lanzas tú**, es público.
- [ ] Guía del sistema para ti (`docs/GUIA-PARA-EL-DUENO.md`) y plan de copias y recuperación (ver abajo).

## Juntos
- [ ] **Cobro automático del Plan 360** (950 € + IVA, o 475 € al firmar y 475 € el día 15): enlace de pago de Stripe, confirmación apuntada en `plan360Servicio.cobros360`, aviso en la agenda. Hace falta tu cuenta de Stripe y pegar el Worker a mano en Cloudflare.
- [ ] Prueba de alta completa de un cliente nuevo en el dominio real (cuenta → código → nube → reglas → web de reservas → pago) con la cuenta de prueba.
- [ ] Decidir LaLiga: montar los dos servidores o avisar a los clientes de que en partidos la web de reservas puede fallar.
- [ ] Publicar las reglas de Firebase si cambian (las tres copias deben ser idénticas; lo vigila `test/reglas.mjs`).

## Tú
- [ ] Escribir tu DNI e IBAN en «Mis datos de coach» del panel (sin eso, el contrato no se envía).
- [ ] Comprobar que el enlace de pago de Stripe de la App funciona y que la web comercial dice 300 € + IVA el primer año.
- [ ] Revisión por un abogado de las condiciones de compra, la política de privacidad y el contrato del Plan 360 (también su versión en catalán e inglés si la quieres).
- [ ] Soporte: un número de WhatsApp, un horario y el procedimiento si un cliente pierde el PIN (generador de licencias, paso 3).
- [ ] Elegir a los primeros 2 o 3 clientes a los que puedas llamar cada día la primera semana.
- [ ] Guardar copias (ver «Copias» en la guía) y apuntar dónde están tus accesos.

## No prometas todavía
- VeriFactu como funcional.
- Pedidos de Glovo, Uber Eats o Just Eat dentro de la app.
- Bizum con Stripe Connect v2 (sin verificar).
- Que no habrá fallos: los primeros días saldrán, y es lo que más mejora la app.

## Lo que añadiría de lo que pedía el informático
Todo lo que pedía en su email ya está cubierto por el dossier salvo esto, que sí aporta:
- [ ] **Vigilancia**: un aviso gratuito si cae `app.`, `reservas.` o `admin.` (UptimeRobot, plan gratuito) y el estado de Cloudflare Pages.
- [ ] **Marcha atrás**: saber volver a la versión anterior en Cloudflare Pages en dos clics (lo practicamos una vez).
- [ ] **Copia del registro de licencias** (`issuedCodes`, `ownerNames`, `codeClaims`): si se pierde, no se puede comprobar ningún código. Exportación mensual desde Firebase, gratuita.
- [ ] **Previsión de costes por cliente**: tabla con los límites gratuitos de Firebase, Cloudflare y Stripe y hasta cuántos clientes aguanta cada uno.
- [ ] **RGPD**: contrato de encargado de tratamiento con tus clientes y registro de actividades (lo revisa el abogado).
