import { formatFullCallsign } from '@/lib/utils';
import {
  createDiscordEmbed,
  type DiscordWebhookPayload,
  sendDiscordWebhook,
} from '@/lib/webhooks/index';
import type { TyperatingChangeData, WebhookOptions } from '@/types/webhooks';

export type { TyperatingChangeData };

export async function sendTyperatingChangeWebhook(
  webhookUrl: string,
  data: TyperatingChangeData,
  options: WebhookOptions
): Promise<void> {
  const { airlineName, airlineCallsign } = options;
  const fullCallsign = formatFullCallsign(airlineCallsign, data.pilotCallsign);
  const ts = Math.floor(data.changedAt.getTime() / 1000);

  const added = data.action === 'added';
  const actionVerb = added ? 'added to' : 'removed from';
  const actionIcon = added ? '➕' : '➖';

  const finalList =
    data.currentTyperatings.length > 0
      ? data.currentTyperatings.map((name) => `• ${name}`).join('\n')
      : '_None_';

  const actorCallsign = data.actorCallsign
    ? formatFullCallsign(airlineCallsign, data.actorCallsign)
    : null;
  const actorLabel = actorCallsign
    ? `${data.actorName} (\`${actorCallsign}\`)`
    : data.actorName;

  const lines = [
    `👨‍✈️ **Pilot:** ${data.pilotName} (\`${fullCallsign}\`)`,
    `${actionIcon} **${data.typeratingName}** ${actionVerb} their type ratings`,
    `📋 **Current Type Ratings:**\n${finalList}`,
    `🛠️ **Changed by:** ${actorLabel}`,
    `⏰ **When:** <t:${ts}:R>`,
  ];

  const embed = createDiscordEmbed({
    title: added ? '🎫 Type Rating Added' : '🚫 Type Rating Removed',
    description: lines.join('\n\n'),
    color: added ? 0x27ae60 : 0xe74c3c,
    footer: { text: airlineName },
    timestamp: data.changedAt.toISOString(),
  });

  const payload: DiscordWebhookPayload = {
    embeds: [embed],
  };

  await sendDiscordWebhook({ url: webhookUrl, payload });
}
