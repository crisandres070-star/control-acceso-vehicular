# Control de acceso

Sistema de control de acceso vehicular construido con Next.js 14, Tailwind CSS y Prisma ORM.

## Funcionalidades

- Autenticación por credenciales para `ADMIN` y `USER`.
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

Debe configurar estas variables en su archivo `.env` local y también en Vercel:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/web_acceso?schema=public"
SESSION_SECRET="change-this-super-secret-value"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
GUARD_USERNAME="guard"
GUARD_PASSWORD="guard123"
```

## Credenciales por defecto

- Admin: `admin` / `admin123`
- Portería: `guard` / `guard123`

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

4. Inicie el entorno local:

```bash
npm run dev
```

5. Si desea cargar datos de ejemplo:

```bash
npm run db:seed
```

## Preparación para producción

Antes de desplegar, confirme que `DATABASE_URL` apunta a una base PostgreSQL válida y ejecute:

```bash
npm run build
```

## Despliegue en Vercel

Para desplegar correctamente en Vercel:

1. Cree una base de datos PostgreSQL gestionada.
2. Configure en Vercel las variables `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GUARD_USERNAME` y `GUARD_PASSWORD`.
3. Use `npm run build` como comando de compilación.
4. Ejecute `npx prisma db push` contra la base PostgreSQL antes del primer uso productivo si el esquema aún no existe.

Con esto, la aplicación queda lista para funcionar con PostgreSQL en producción manteniendo el comportamiento actual.
