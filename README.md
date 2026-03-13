# Control de acceso

Sistema de control de acceso vehicular construido con Next.js 14, Tailwind CSS y Prisma ORM.

## Funcionalidades

- Autenticación por credenciales para `ADMIN` y `USER`, con usuarios persistidos en base de datos y fallback legacy por variables de entorno.
- CRUD de vehículos.
- Validación de acceso por patente.
- Registro automático de accesos.
- Exportación XLSX de bitácoras.
- Campo interno alfanumérico `Código interno`.

## Stack

- Next.js 14 App Router
- Tailwind CSS
- Prisma ORM
- PostgreSQL

## Variables de entorno

Debe configurar estas variables en `.env` o `.env.local` para desarrollo local y también en Vercel:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/web_acceso?schema=public"
SESSION_SECRET="change-this-super-secret-value"
OPENAI_API_KEY=""
OPENAI_IMPORT_ASSISTANT_MODEL="gpt-4.1-mini"
```

Las variables `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GUARD_USERNAME` y `GUARD_PASSWORD` siguen siendo opcionales solo como compatibilidad legacy. La operación recomendada queda con usuarios almacenados en base de datos.

`OPENAI_API_KEY` es opcional. Solo habilita la etapa asistida por IA en `/admin/importaciones`. Si no está configurada, el flujo manual actual sigue funcionando sin cambios. `OPENAI_IMPORT_ASSISTANT_MODEL` también es opcional y permite ajustar el modelo usado solo en el servidor.

`.env.example` es solo una plantilla de referencia. Next.js no carga ese archivo en runtime. Para desarrollo local use `.env` o `.env.local`.

## Cuentas operativas iniciales

Las cuentas operativas se crean en la base de datos con hash seguro ejecutando:

```bash
npm run db:seed:users
```

Usuarios iniciales:

- Admin: `Lquispe`
- Portería: `PorteriaCalaCala`
- Portería: `PorteriaSoledad`
- Portería: `PorteriaTana`
- Portería: `PorteriaNegreiros`

## Ejecución local después de la migración

PostgreSQL es ahora obligatorio para producción y también para el entorno local si desea ejecutar el sistema después de esta migración.

1. Instale dependencias:

```bash
npm install
```

2. Genere el cliente Prisma:

```bash
npx prisma generate
```

3. Aplique el esquema en PostgreSQL:

```bash
npx prisma db push
```

4. Si va a usar el asistente de importación con IA, configure `OPENAI_API_KEY` en `.env` o `.env.local` antes de iniciar la app.

5. Inicie el entorno local:

```bash
npm run dev
```

6. Si desea cargar datos de ejemplo:

```bash
npm run db:seed
```

7. Si desea crear o reconciliar las cuentas operativas reales:

```bash
npm run db:seed:users
```

## Importaciones Excel con IA asistente

El módulo `/admin/importaciones` ahora tiene dos caminos compatibles entre sí:

- Flujo manual clásico: sube el Excel y valida con las reglas exactas del sistema.
- Flujo asistido por IA: analiza hojas, encabezados parecidos, posibles normalizaciones y warnings antes de generar un preview normal.

La IA no importa datos directamente, no reemplaza la validación dura y no evita la confirmación transaccional final. Solo propone una interpretación inicial para reducir errores humanos al preparar archivos reales.

## Preparación para producción

Antes de desplegar, confirme que `DATABASE_URL` apunta a una base PostgreSQL válida y ejecute:

```bash
npm run build
```

## Despliegue en Vercel

Para desplegar correctamente en Vercel:

1. Cree una base de datos PostgreSQL gestionada.
2. Configure en Vercel las variables `DATABASE_URL` y `SESSION_SECRET`.
3. Ejecute `npm run db:seed:users` contra la base productiva para dejar creadas las cuentas operativas.
4. Si desea habilitar la etapa asistida por IA del importador, agregue `OPENAI_API_KEY` y opcionalmente `OPENAI_IMPORT_ASSISTANT_MODEL`.
5. Use `npm run build` como comando de compilación.
6. Ejecute `npx prisma db push` contra la base PostgreSQL antes del primer uso productivo si el esquema aún no existe.

Con esto, la aplicación queda lista para funcionar con PostgreSQL en producción manteniendo el comportamiento actual.
