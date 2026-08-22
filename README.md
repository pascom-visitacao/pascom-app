This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Notificações por e-mail (Fase 5)

Duas rotas de cron disparam e-mails via [Resend](https://resend.com):

- `GET /api/cron/notify-deadline` — atividades com prazo a até 3 dias, atribuídas e não concluídas. Disparada 1x/dia pelo **cron nativo da Vercel** (`vercel.json`), às 11:00 UTC (08:00 BRT).
- `GET /api/cron/notify-unassigned-and-open-slots` — atividades sem responsável e vagas de escala abertas. O plano Vercel Hobby só permite cron nativo diário, então essa rota é chamada de hora em hora por um **GitHub Actions scheduled workflow** (`.github/workflows/notify-unassigned-and-open-slots.yml`), não pelo cron da Vercel.

Como a segunda rota é chamada de fora da infraestrutura da Vercel, ambas as rotas exigem o header `Authorization: Bearer <CRON_SECRET>` — sem ele, respondem 401. Configure o mesmo valor de `CRON_SECRET` em dois lugares:

1. **Vercel**: Project Settings → Environment Variables → `CRON_SECRET`
2. **GitHub**: Settings → Secrets and variables → Actions → `CRON_SECRET`

Também é necessário configurar `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API) e `RESEND_API_KEY` (resend.com → API Keys) como env vars server-only na Vercel. Veja `.env.local.example` para o detalhamento de cada uma.

### ⚠️ Resend em modo sandbox

Enquanto nenhum domínio de envio estiver verificado no Resend, a conta opera em **modo sandbox**: os e-mails só chegam na caixa de entrada do dono da conta Resend, não na equipe real de Pasconeiros. Isso não é um bug — é uma restrição do Resend para contas sem domínio verificado. Não assuma que a equipe está recebendo os avisos até que a verificação de domínio seja feita (item planejado para depois desta fase).
