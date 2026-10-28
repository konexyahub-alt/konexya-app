import "server-only";

/**
 * Envio de e-mail transacional pelo Resend. Sem RESEND_API_KEY configurada, não envia e avisa quem
 * chamou (a tela mostra o link para copiar).
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return { sent: false };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
      signal: AbortSignal.timeout(8000),
    });
    return { sent: res.ok };
  } catch {
    return { sent: false };
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
