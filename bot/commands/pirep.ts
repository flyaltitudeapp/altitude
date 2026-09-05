import type { ChatInputCommandInteraction } from 'discord.js';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';

import { findUserByDiscord } from '@/bot/utils/user-lookup';
import { getAircraft } from '@/db/queries/aircraft';
import { getMultipliers } from '@/db/queries/multipliers';
import {
  createPirep,
  sendPirepWebhookNotification,
} from '@/domains/pireps/create-pirep';
import { convertTimeToMinutes, formatHoursMinutes } from '@/lib/utils';

export async function getPirepCommandData() {
  const [aircraftList, multipliersList] = await Promise.all([
    getAircraft(),
    getMultipliers(),
  ]);

  const aircraftChoices = aircraftList.map((ac) => ({
    name: `${ac.name} (${ac.livery})`,
    value: ac.id,
  }));

  const multiplierChoices = [
    { name: 'None', value: 'none' },
    ...multipliersList.map((m) => ({
      name: `${m.name} (${m.value}x)`,
      value: m.id,
    })),
  ];

  return new SlashCommandBuilder()
    .setName('pirep')
    .setDescription('File a PIREP (manually)')
    .addStringOption((option) =>
      option
        .setName('flight_number')
        .setDescription('Flight number (e.g., AF123)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('departure')
        .setDescription('Departure airport ICAO (e.g., KSFO)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('arrival')
        .setDescription('Arrival airport ICAO (e.g., EGLL)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('flight_time')
        .setDescription('Flight time in HH:MM format (e.g., 08:30)')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('cargo')
        .setDescription('Cargo weight in kg')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200000)
    )
    .addIntegerOption((option) =>
      option
        .setName('fuel')
        .setDescription('Fuel burned in kg')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200000)
    )
    .addStringOption((option) =>
      option
        .setName('aircraft')
        .setDescription('Select aircraft')
        .setRequired(true)
        .addChoices(...aircraftChoices)
    )
    .addStringOption((option) =>
      option
        .setName('multiplier')
        .setDescription('Select multiplier (optional)')
        .setRequired(false)
        .addChoices(...multiplierChoices)
    )
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('Flight category')
        .setRequired(true)
        .addChoices(
          { name: 'Casual', value: 'casual' },
          { name: 'Career', value: 'career' }
        )
    );
}

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const user = await findUserByDiscord(interaction.user);

    if (!user) {
      await interaction.reply({
        content: `❌ No pilot account found for Discord user: ${interaction.user.username}. Please link your Discord account in your profile settings.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const flightNumber = interaction.options.getString('flight_number', true);
    const departure = interaction.options
      .getString('departure', true)
      .toUpperCase();
    const arrival = interaction.options
      .getString('arrival', true)
      .toUpperCase();
    const flightTimeString = interaction.options.getString('flight_time', true);
    const cargo = interaction.options.getInteger('cargo', true);
    const fuel = interaction.options.getInteger('fuel', true);
    const aircraftId = interaction.options.getString('aircraft', true);
    const multiplierId = interaction.options.getString('multiplier');
    const category = interaction.options.getString('category', true) as
      | 'casual'
      | 'career';

    const icaoRegex = /^[A-Z]{4}$/;
    if (!icaoRegex.test(departure) || !icaoRegex.test(arrival)) {
      await interaction.editReply(
        '❌ ICAO codes must be exactly 4 uppercase letters (e.g., KSFO, EGLL)'
      );
      return;
    }

    const flightTime = convertTimeToMinutes(flightTimeString);
    if (flightTime === null || flightTime < 1) {
      await interaction.editReply(
        '❌ Flight time must be in HH:MM format (e.g., 08:30) and at least 1 minute'
      );
      return;
    }

    const [aircraftList, multipliersList] = await Promise.all([
      getAircraft(),
      getMultipliers(),
    ]);

    const aircraft = aircraftList.find((ac) => ac.id === aircraftId);
    if (!aircraft) {
      await interaction.editReply('❌ Aircraft not found');
      return;
    }

    const pirepData = {
      flightNumber,
      date: new Date(),
      departureIcao: departure,
      arrivalIcao: arrival,
      flightTime,
      cargo,
      fuelBurned: fuel,
      aircraftId: aircraft.id,
      multiplierId:
        multiplierId === 'none' || !multiplierId ? undefined : multiplierId,
      category,
    };

    const { newPirep, adjustedFlightTime } = await createPirep(
      pirepData,
      user.id
    );

    await sendPirepWebhookNotification(
      pirepData,
      newPirep.id,
      adjustedFlightTime,
      user.id
    );

    const multiplier =
      multiplierId && multiplierId !== 'none'
        ? multipliersList.find((m) => m.id === multiplierId)
        : null;

    const embed = {
      color: 0x00ff00,
      title: '✅ PIREP Submitted Successfully',
      fields: [
        {
          name: '📋 Flight Details',
          value: `**Flight:** ${flightNumber}\n**Route:** ${departure} → ${arrival}\n**Aircraft:** ${aircraft.name} (${aircraft.livery})`,
          inline: false,
        },
        {
          name: '⏱️ Flight Time',
          value: multiplier
            ? `**Raw:** ${formatHoursMinutes(flightTime)}\n**Adjusted:** ${formatHoursMinutes(adjustedFlightTime)} (${multiplier.name} applied)`
            : `**Flight Time:** ${formatHoursMinutes(adjustedFlightTime)}`,
          inline: false,
        },
        {
          name: '📦 Cargo',
          value: `${cargo.toLocaleString()} kg`,
          inline: false,
        },
        {
          name: '⛽ Fuel',
          value: `${fuel.toLocaleString()} kg`,
          inline: false,
        },
        { name: '🎖️ Status', value: 'Pending Review', inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `PIREP ID: ${newPirep.id}`,
      },
    };

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create PIREP';
    await interaction.editReply(`❌ ${errorMessage}`);
  }
}
