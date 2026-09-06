import { formatFullCallsign, formatHoursMinutes } from '@/lib/utils';
import {
  createDiscordEmbed,
  type DiscordWebhookPayload,
  sendDiscordWebhook,
} from '@/lib/webhooks/index';
import type { PirepData, WebhookOptions } from '@/types/webhooks';

export type { PirepData };

export async function sendPirepWebhook(
  webhookUrl: string,
  pirepData: PirepData,
  options: WebhookOptions
): Promise<void> {
  const { airlineName, airlineCallsign } = options;
  const fullCallsign = formatFullCallsign(
    airlineCallsign,
    pirepData.pilotCallsign
  );
  const ts = Math.floor(pirepData.submittedAt.getTime() / 1000);

  const lines = [
    `🛫 **Flight:** ${pirepData.flightNumber}`,
    `🛣️ **Route:** ${pirepData.departure} → ${pirepData.arrival}`,
    `👨‍✈️ **Pilot:** ${pirepData.pilotName} (\`${fullCallsign}\`)`,
    `✈️ **Aircraft:** ${pirepData.aircraft}`,
    `⏱️ **Flight Time:** ${formatHoursMinutes(pirepData.flightTime)}`,
    `🏷️ **Category:** ${pirepData.category === 'career' ? 'Career' : 'Casual'}`,
  ];

  if (pirepData.fuel !== undefined) {
    lines.push(`⛽ **Fuel Used:** ${pirepData.fuel.toLocaleString()} kg`);
  }

  if (pirepData.cargo !== undefined) {
    lines.push(`📦 **Cargo:** ${pirepData.cargo.toLocaleString()} kg`);
  }

  if (pirepData.remarks) {
    lines.push(`💬 **Remarks:** ${pirepData.remarks}`);
  }

  if (pirepData.autoApproved) {
    lines.push('✅ **Status:** Automatically approved');
  } else if (pirepData.failedChecks && pirepData.failedChecks.length > 0) {
    lines.push(`⚠️ **Needs review:** ${pirepData.failedChecks.join(', ')}`);
  }

  lines.push(`📅 **Submitted:** <t:${ts}:R>`);

  lines.push(`[View PIREP](${options.baseUrl}/admin/pireps/${pirepData.id})`);

  const embed = createDiscordEmbed({
    title: pirepData.autoApproved
      ? '✅ PIREP Auto-Approved'
      : '✈️ New PIREP Submitted',
    description: lines.join('\n\n'),
    color: pirepData.autoApproved ? 0x2ecc71 : 0xf39c12,
    footer: { text: airlineName },
    timestamp: pirepData.submittedAt.toISOString(),
  });

  const payload: DiscordWebhookPayload = {
    embeds: [embed],
  };

  await sendDiscordWebhook({ url: webhookUrl, payload });
}
