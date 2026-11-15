# 01 · Setup

**Tool:** Claude Code (Opus 5.5)

## Prompt

> Let's go ahead initializing the project, installing the dependencies and setting the database

## Follow-ups

> Puedes ayudarme a verificar las conexiones, ya estan las variables de entorno

> ya actualicé el DATABASE_URL, prueba de nuevo

> Puedes revisar de nuevo

> Vamos usar mejor el project url, project id y el publishable key

(Pushed back: the publishable key uses the `anon` role, which RLS-without-policies blocks by design, and opening it would expose user data. Kept `DATABASE_URL` + Drizzle per spec.)

> Ya quedo

(Switched `DATABASE_URL` from the IPv6-only direct host to the Supabase session pooler, applied `0000_init`, `/health` → ok.)

> sí, haz el commit y crea la rama

> sí, haz push y abre el PR

> Que cambios quieres realizar con respecto al middleware.ts?

> Vale, renombralo y metelo en el mismo PR

(Renamed the frontend route guard `middleware.ts` → `proxy.ts` in `03-frontend.md`, `CLAUDE.md` and `prompts/system/CLAUDE.md`, per the Next 16 upgrade guide. Express `middleware/` in the backend is unchanged.)
