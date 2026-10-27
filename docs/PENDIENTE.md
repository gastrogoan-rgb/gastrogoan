# Pendiente (guardado el 27/10/2026)

Última versión publicada: sello 09/10/2026 13:19. Todo lo anterior está publicado y con la batería en verde.

1. **Privacidad (lo más serio):** las reservas y pedidos (`public/$publicId/requests`, con nombre y teléfono)
   se pueden LEER con solo conocer el identificador del QR, porque todo es sesión anónima. Arreglo previsto
   sin coste: la app del negocio entra con correo y contraseña de Firebase y las reglas exigen
   `sign_in_provider != 'anonymous'` para leer; la web pública sigue anónima y solo escribe. Migrar a los
   negocios ya dados de alta, probándolo con el emulador.
2. **Política de contenido (CSP)** en `_headers`: delicada, la app lleva mucho código dentro del HTML.
3. **Protección contra bots** en la web de reservas (Cloudflare Turnstile + verificación en el Worker).
4. **Fiscal sin aplicar**: ver `docs/fiscal/PENDIENTE-GESTOR.md` (IVA de bebidas para llevar al 21 %,
   autoconsumo a valor de mercado, horas extra y pluses, bonificación de fijos discontinuos, finiquitos,
   349 y comisiones de Glovo en el 347…) y las dudas de criterio para llevar al gestor.
5. **Prueba de restauración completa** de una copia en un negocio limpio, y pantalla de revisión de cobros duplicados.
6. **Pruebas con aparatos reales**: imprimir un ticket desde un iPad, leer una factura con una clave de Google
   de verdad, un pedido por QR desde un móvil (las reglas de la plataforma ya están pegadas).
7. **Vender** (sigue siendo lo único que falta de verdad).
