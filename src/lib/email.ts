import { Resend } from "resend";

// Enquanto o domínio não for verificado no Resend, todo e-mail
// enviado por essa conta só chega de verdade na caixa do dono da
// conta Resend, independente do destinatário passado aqui — é
// restrição do modo sandbox deles, não bug. Ver README.
const FROM = "PASCOM <onboarding@resend.dev>";

function getClient() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string[];
  subject: string;
  html: string;
}) {
  if (to.length === 0) return;
  const resend = getClient();
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[email] falha ao enviar:", error);
  }
}

const WRAP = (title: string, body: string) => `
  <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
    <h2 style="color: #231f20;">${title}</h2>
    ${body}
    <p style="margin-top: 24px; font-size: 13px; color: #777475;">
      Pastoral da Comunicação — Paróquia N. Sra. da Visitação
    </p>
  </div>
`;

export function unassignedActivitiesEmail(activities: { title: string }[], areaName: string) {
  const items = activities.map((a) => `<li>${a.title}</li>`).join("");
  return WRAP(
    "Atividades sem responsável",
    `<p>Existem atividades na área <strong>${areaName}</strong> aguardando alguém assumir:</p><ul>${items}</ul>`,
  );
}

export function openSchedulesEmail(schedules: { role_needed: string }[], areaName: string, eventTitle: string) {
  const items = schedules.map((s) => `<li>${s.role_needed}</li>`).join("");
  return WRAP(
    "Vaga de escala aberta",
    `<p>O evento <strong>${eventTitle}</strong> tem vagas abertas na área <strong>${areaName}</strong>:</p><ul>${items}</ul>`,
  );
}

export function dueDateReminderEmail(title: string, dueDate: string) {
  return WRAP(
    "Prazo se aproximando",
    `<p>A atividade <strong>${title}</strong> tem prazo em ${new Date(dueDate).toLocaleDateString("pt-BR")}.</p>`,
  );
}

export function activityAssignedEmail(title: string) {
  return WRAP(
    "Atividade atribuída a você",
    `<p>A Coordenação te designou como responsável pela atividade <strong>${title}</strong>.</p>`,
  );
}

export function scheduleReminderEmail(roleNeeded: string, eventTitle: string, eventDate: string) {
  return WRAP(
    "Lembrete: escala amanhã",
    `<p>Você está escalado(a) como <strong>${roleNeeded}</strong> pro evento <strong>${eventTitle}</strong>, amanhã (${new Date(eventDate).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}).</p>`,
  );
}
