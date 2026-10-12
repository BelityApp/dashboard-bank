# Belity Dashboard (React + TypeScript)

Reescritura del dashboard Flutter. Stack: Vite, React 19, TypeScript, Tailwind CSS v4, React Router, TanStack Query. Gestor: pnpm.

```bash
cp .env.example .env.local   # configura VITE_MS_AUTH_URL y VITE_MS_BANK_URL
pnpm install
pnpm dev
pnpm build
```

Los endpoints viven en `src/api/` (un módulo por dominio, con el endpoint documentado sobre cada función).
