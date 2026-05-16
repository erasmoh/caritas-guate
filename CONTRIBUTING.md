# Contribuir a Caritas en 16-bit

¡Gracias por querer aportar! Este es un proyecto comunitario, así que cualquier ayuda — desde un typo en el README hasta una feature nueva — es bienvenida.

## Setup local

Sigue el [Quickstart del README](./README.md#quickstart). Requisitos:

- Node.js 20+ (recomendado 22 LTS)
- npm 10+ (o pnpm/yarn/bun equivalentes)
- Un proyecto de Supabase **solo si** vas a tocar el muro `/muro`

## Flujo de trabajo

1. Forkea el repo y crea una rama desde `main`:
   ```bash
   git checkout -b feat/mi-cambio
   ```
2. Haz commits chicos y descriptivos. Mensajes en inglés o español, ambos sirven.
3. Antes de abrir el PR:
   ```bash
   npm run lint
   npm run build
   ```
   Ambos deben pasar.
4. Abre el PR contra `main` describiendo:
   - Qué cambia y por qué.
   - Cómo lo probaste.
   - Capturas o video si toca UI.

## Estilo de código

- TypeScript estricto. Nada de `any` salvo que esté justificado.
- Componentes y hooks de React 19. Prefiere Server Components cuando sea posible.
- Tailwind para estilos; evita CSS suelto salvo en `globals.css`.
- No introduzcas dependencias nuevas sin discutirlo en un issue primero.

## Reportar bugs

Abre un issue con:

- Pasos para reproducir.
- Comportamiento esperado vs. real.
- Navegador / SO / versión de Node.
- Logs relevantes (sin secretos).

## Seguridad

Si encuentras una vulnerabilidad **no abras un issue público**. Escribe directamente al autor (ver email en los commits del repo) con detalles y, si es posible, una PoC.

## Código de conducta

Sé respetuoso. No toleramos acoso ni lenguaje discriminatorio. Cualquier reporte se trata en privado.

## Licencia

Al contribuir aceptas que tu código se publique bajo la licencia [MIT](./LICENSE) del proyecto.
