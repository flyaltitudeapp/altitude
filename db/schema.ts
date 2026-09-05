import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import * as t from 'drizzle-orm/sqlite-core';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .$defaultFn(() => false)
      .notNull(),
    image: text('image'),
    verified: integer('verified', { mode: 'boolean' })
      .$defaultFn(() => false)
      .notNull(),
    callsign: integer('callsign', { mode: 'number' }).unique(),
    role: text('role'),
    banned: integer('banned', { mode: 'boolean' })
      .$defaultFn(() => false)
      .notNull(),
    bannedReason: text('banned_reason'),
    banExpires: integer('ban_expires', { mode: 'timestamp' }),
    discordUsername: text('discord_username').unique().notNull(),
    discourseUsername: text('discourse_username').unique(),
    infiniteFlightId: text('infinite_flight_id').unique(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('users_email_index').on(table.email),
    t.index('users_callsign_index').on(table.callsign),
    t.index('users_name_index').on(table.name),
    t.index('users_search_composite').on(table.name, table.callsign),
    t.index('users_created_at_index').on(table.createdAt),
  ]
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    impersonatedBy: text('impersonated_by').references(() => users.id, {
      onDelete: 'cascade',
    }),
  },
  (table) => [t.index('sessions_user_id_index').on(table.userId)]
);

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('accounts_user_id_index').on(table.userId),
    t
      .index('accounts_provider_account_index')
      .on(table.accountId, table.providerId),
  ]
);

export const verifications = sqliteTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [t.index('verifications_identifier_index').on(table.identifier)]
);

export const airline = sqliteTable(
  'airline',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    callsign: text('callsign').notNull(),
    setup: integer('setup', { mode: 'boolean' })
      .$defaultFn(() => false)
      .notNull(),
    theme: text('theme').$defaultFn(() => 'default'),
    lightLogoUrl: text('light_logo_url'),
    darkLogoUrl: text('dark_logo_url'),
    faviconUrl: text('favicon_url'),
    authImageUrl: text('auth_image_url'),
    pirepsWebhookUrl: text('pireps_webhook_url'),
    newApplicationsWebhookUrl: text('new_applications_webhook_url'),
    rankUpWebhookUrl: text('rank_up_webhook_url'),
    leaveRequestWebhookUrl: text('leave_request_webhook_url'),
    inactivityWebhookUrl: text('inactivity_webhook_url'),
    typeRatingWebhookUrl: text('type_rating_webhook_url'),
    inactivityPeriod: integer('inactivity_period', {
      mode: 'number',
    }).$defaultFn(() => 30),
    smtpHost: text('smtp_host'),
    smtpPort: integer('smtp_port', { mode: 'number' }),
    smtpUsername: text('smtp_username'),
    smtpPassword: text('smtp_password'),
    smtpFromEmail: text('smtp_from_email'),
    smtpFromName: text('smtp_from_name'),
    smtpSecure: integer('smtp_secure', { mode: 'boolean' }),
    callsignMinRange: integer('callsign_min_range', { mode: 'number' })
      .$defaultFn(() => 1)
      .notNull(),
    callsignMaxRange: integer('callsign_max_range', { mode: 'number' })
      .$defaultFn(() => 999)
      .notNull(),
    infiniteFlightApiKey: text('infinite_flight_api_key'),
    liveFilterSuffix: text('live_filter_suffix'),
    liveFilterVirtualOrg: text('live_filter_virtual_org'),
    liveFilterType: text('live_filter_type').$defaultFn(() => 'virtual_org'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('airline_name_index').on(table.name),
    t.index('airline_callsign_index').on(table.callsign),
  ]
);

export const discordConfig = sqliteTable('discord_config', {
  id: text('id').primaryKey(),
  botToken: text('bot_token'),
  clientId: text('client_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const aircraft = sqliteTable(
  'aircraft',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    livery: text('livery').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('aircraft_name_index').on(table.name),
    t.index('aircraft_livery_index').on(table.livery),
    t.uniqueIndex('aircraft_name_livery_unique').on(table.name, table.livery),
  ]
);

export const multipliers = sqliteTable(
  'multipliers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    value: real('value').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('multipliers_name_index').on(table.name),
    t.index('multipliers_value_index').on(table.value),
  ]
);

export const pireps = sqliteTable(
  'pireps',
  {
    id: text('id').primaryKey(),
    flightNumber: text('flight_number').notNull(),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    departureIcao: text('departure_icao').notNull(),
    arrivalIcao: text('arrival_icao').notNull(),
    flightTime: integer('flight_time', { mode: 'number' }).notNull(),
    cargo: integer('cargo', { mode: 'number' }),
    fuelBurned: integer('fuel_burned', { mode: 'number' }),
    passengers: integer('passengers', { mode: 'number' }),
    multiplierId: text('multiplier_id').references(() => multipliers.id, {
      onDelete: 'set null',
    }),
    aircraftId: text('aircraft_id').references(() => aircraft.id, {
      onDelete: 'set null',
    }),
    comments: text('comments'),
    deniedReason: text('denied_reason'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    category: text('category', { enum: ['casual', 'career'] })
      .notNull()
      .default('casual'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('pireps_status_date_index').on(table.status, table.date),
    t
      .index('pireps_user_status_index')
      .on(table.userId, table.status, table.category),

    t
      .index('pireps_analytics_covering')
      .on(
        table.status,
        table.date,
        table.category,
        table.userId,
        table.flightTime
      ),
    t
      .index('pireps_daily_stats')
      .on(table.status, table.date, table.category, table.flightTime),
  ]
);

export const routes = sqliteTable(
  'routes',
  {
    id: text('id').primaryKey(),
    departureIcao: text('departure_icao').notNull(),
    arrivalIcao: text('arrival_icao').notNull(),
    flightTime: integer('flight_time', { mode: 'number' }).notNull(),
    details: text('details'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t
      .index('routes_departure_arrival_index')
      .on(table.departureIcao, table.arrivalIcao),
    t.index('routes_flight_time_index').on(table.flightTime),
  ]
);

export const routesFlightNumbers = sqliteTable(
  'routes_flight_numbers',
  {
    id: text('id').primaryKey(),
    routeId: text('route_id')
      .notNull()
      .references(() => routes.id, { onDelete: 'cascade' }),
    flightNumber: text('flight_number').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('routes_flight_numbers_route_id_index').on(table.routeId),
    t.index('routes_flight_numbers_flight_number_index').on(table.flightNumber),
    t
      .index('routes_flight_numbers_composite_index')
      .on(table.routeId, table.flightNumber),
  ]
);

export const routeAircraft = sqliteTable(
  'route_aircraft',
  {
    id: text('id').primaryKey(),
    routeId: text('route_id')
      .notNull()
      .references(() => routes.id, { onDelete: 'cascade' }),
    aircraftId: text('aircraft_id')
      .notNull()
      .references(() => aircraft.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('route_aircraft_route_id_index').on(table.routeId),
    t.index('route_aircraft_aircraft_id_index').on(table.aircraftId),
  ]
);

export const ranks = sqliteTable(
  'ranks',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    minimumFlightTime: integer('minimum_flight_time', { mode: 'number' })
      .notNull()
      .unique(), // The minimum career flight time to get the rank
    maximumFlightTime: integer('maximum_flight_time', { mode: 'number' }), // The maximum flight time you can fly with this rank (null = no limit)
    allowAllAircraft: integer('allow_all_aircraft', { mode: 'boolean' })
      .$defaultFn(() => false)
      .notNull(), // If true, this rank can fly any aircraft regardless of rankAircraft entries
    typeRatingSlots: integer('type_rating_slots', { mode: 'number' })
      .default(0)
      .notNull(), // How many typeratings a pilot at this rank may hold (no stacking)
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('ranks_name_index').on(table.name),
    t.index('ranks_minimum_flight_time_index').on(table.minimumFlightTime),
    t.index('ranks_maximum_flight_time_index').on(table.maximumFlightTime),
  ]
);

export const rankAircraft = sqliteTable(
  'rank_aircraft',
  {
    id: text('id').primaryKey(),
    rankId: text('rank_id')
      .notNull()
      .references(() => ranks.id, { onDelete: 'cascade' }),
    aircraftId: text('aircraft_id')
      .notNull()
      .references(() => aircraft.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('rank_aircraft_rank_id_index').on(table.rankId),
    t.index('rank_aircraft_aircraft_id_index').on(table.aircraftId),
    t.uniqueIndex('rank_aircraft_unique').on(table.rankId, table.aircraftId),
  ]
);

export const typeratings = sqliteTable(
  'typeratings',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    image: text('image'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [t.index('typeratings_name_index').on(table.name)]
);

export const typeratingAircraft = sqliteTable(
  'typerating_aircraft',
  {
    id: text('id').primaryKey(),
    typeratingId: text('typerating_id')
      .notNull()
      .references(() => typeratings.id, { onDelete: 'cascade' }),
    aircraftId: text('aircraft_id')
      .notNull()
      .references(() => aircraft.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('typerating_aircraft_typerating_id_index').on(table.typeratingId),
    t.index('typerating_aircraft_aircraft_id_index').on(table.aircraftId),
    t
      .uniqueIndex('typerating_aircraft_unique')
      .on(table.typeratingId, table.aircraftId),
  ]
);

export const userTyperatings = sqliteTable(
  'user_typeratings',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    typeratingId: text('typerating_id')
      .notNull()
      .references(() => typeratings.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('user_typeratings_user_id_index').on(table.userId),
    t.index('user_typeratings_typerating_id_index').on(table.typeratingId),
    t
      .uniqueIndex('user_typeratings_unique')
      .on(table.userId, table.typeratingId),
  ]
);

export const leaveRequests = sqliteTable(
  'leave_requests',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
    endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('leave_requests_user_id_index').on(table.userId),
    t.index('leave_requests_status_index').on(table.status),
    t.index('leave_requests_start_date_index').on(table.startDate),
    t.index('leave_requests_end_date_index').on(table.endDate),
    t
      .index('leave_requests_active_lookup')
      .on(table.userId, table.status, table.startDate, table.endDate),
  ]
);

export const airports = sqliteTable(
  'airports',
  {
    id: text('id').primaryKey(),
    icao: text('icao').notNull(),
    iata: text('iata'),
    name: text('name').notNull(),
    country: text('country').notNull(),
    continent: text('continent').notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    elevation: integer('elevation_ft', { mode: 'number' }),
    type: text('type').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('airports_icao_index').on(table.icao),
    t.index('airports_iata_index').on(table.iata),
    t.index('airports_country_index').on(table.country),
    t.index('airports_type_index').on(table.type),
  ]
);

export const pirepEvents = sqliteTable(
  'pirep_events',
  {
    id: text('id').primaryKey(),
    pirepId: text('pirep_id')
      .notNull()
      .references(() => pireps.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    performedBy: text('performed_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    details: text('details'),
    previousValues: text('previous_values'),
    newValues: text('new_values'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('pirep_events_pirep_id_index').on(table.pirepId),
    t.index('pirep_events_action_index').on(table.action),
    t.index('pirep_events_performed_by_index').on(table.performedBy),
    t.index('pirep_events_created_at_index').on(table.createdAt),
  ]
);

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    departureIcao: text('departure_icao').notNull(),
    arrivalIcao: text('arrival_icao').notNull(),
    departureTime: integer('departure_time', { mode: 'timestamp' }).notNull(),
    flightTime: integer('flight_time', { mode: 'number' }).notNull(),
    flightNumber: text('flight_number').notNull(),
    cargo: integer('cargo', { mode: 'number' }).notNull(),
    fuel: integer('fuel', { mode: 'number' }).notNull(),
    multiplierId: text('multiplier_id').references(() => multipliers.id, {
      onDelete: 'set null',
    }),
    status: text('status')
      .notNull()
      .$defaultFn(() => 'draft'),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('events_status_index').on(table.status),
    t.index('events_departure_time_index').on(table.departureTime),
    t.index('events_created_by_index').on(table.createdBy),
    t.index('events_departure_icao_index').on(table.departureIcao),
    t.index('events_arrival_icao_index').on(table.arrivalIcao),
    t.index('events_flight_number_index').on(table.flightNumber),
  ]
);

export const eventAircraft = sqliteTable(
  'event_aircraft',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    aircraftId: text('aircraft_id')
      .notNull()
      .references(() => aircraft.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('event_aircraft_event_id_index').on(table.eventId),
    t.index('event_aircraft_aircraft_id_index').on(table.aircraftId),
    t.uniqueIndex('event_aircraft_unique').on(table.eventId, table.aircraftId),
  ]
);

export const eventGates = sqliteTable(
  'event_gates',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    gateNumber: text('gate_number').notNull(),
    airportType: text('airport_type').notNull(), // 'departure' or 'arrival'
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('event_gates_event_id_index').on(table.eventId),
    t.index('event_gates_airport_type_index').on(table.airportType),
    t
      .uniqueIndex('event_gates_unique')
      .on(table.eventId, table.gateNumber, table.airportType),
  ]
);

export const eventParticipants = sqliteTable(
  'event_participants',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    departureGateId: text('departure_gate_id').references(() => eventGates.id, {
      onDelete: 'set null',
    }),
    arrivalGateId: text('arrival_gate_id').references(() => eventGates.id, {
      onDelete: 'set null',
    }),
    joinedAt: integer('joined_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    t.index('event_participants_event_id_index').on(table.eventId),
    t.index('event_participants_user_id_index').on(table.userId),
    t
      .index('event_participants_departure_gate_id_index')
      .on(table.departureGateId),
    t.index('event_participants_arrival_gate_id_index').on(table.arrivalGateId),
    t.uniqueIndex('event_participants_unique').on(table.eventId, table.userId),
  ]
);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

export type Verification = InferSelectModel<typeof verifications>;
export type NewVerification = InferInsertModel<typeof verifications>;

export type Airline = InferSelectModel<typeof airline>;
export type NewAirline = InferInsertModel<typeof airline>;

export type Aircraft = InferSelectModel<typeof aircraft>;
export type NewAircraft = InferInsertModel<typeof aircraft>;

export type Multiplier = InferSelectModel<typeof multipliers>;
export type NewMultiplier = InferInsertModel<typeof multipliers>;

export type Pirep = InferSelectModel<typeof pireps>;
export type NewPirep = InferInsertModel<typeof pireps>;

export type RoutesFlightNumber = InferSelectModel<typeof routesFlightNumbers>;
export type NewRoutesFlightNumber = InferInsertModel<
  typeof routesFlightNumbers
>;

export type RouteAircraft = InferSelectModel<typeof routeAircraft>;
export type NewRouteAircraft = InferInsertModel<typeof routeAircraft>;

export type Route = InferSelectModel<typeof routes>;
export type NewRoute = InferInsertModel<typeof routes>;

export type Rank = InferSelectModel<typeof ranks>;
export type NewRank = InferInsertModel<typeof ranks>;

export type RankAircraft = InferSelectModel<typeof rankAircraft>;
export type NewRankAircraft = InferInsertModel<typeof rankAircraft>;

export type Typerating = InferSelectModel<typeof typeratings>;
export type NewTyperating = InferInsertModel<typeof typeratings>;

export type TyperatingAircraft = InferSelectModel<typeof typeratingAircraft>;
export type NewTyperatingAircraft = InferInsertModel<typeof typeratingAircraft>;

export type UserTyperating = InferSelectModel<typeof userTyperatings>;
export type NewUserTyperating = InferInsertModel<typeof userTyperatings>;

export type LeaveRequest = InferSelectModel<typeof leaveRequests>;
export type NewLeaveRequest = InferInsertModel<typeof leaveRequests>;

export type Airport = InferSelectModel<typeof airports>;
export type NewAirport = InferInsertModel<typeof airports>;

export type PirepEvent = InferSelectModel<typeof pirepEvents>;
export type NewPirepEvent = InferInsertModel<typeof pirepEvents>;

export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;

export type EventAircraft = InferSelectModel<typeof eventAircraft>;
export type NewEventAircraft = InferInsertModel<typeof eventAircraft>;

export type EventGate = InferSelectModel<typeof eventGates>;
export type NewEventGate = InferInsertModel<typeof eventGates>;

export type EventParticipant = InferSelectModel<typeof eventParticipants>;
export type NewEventParticipant = InferInsertModel<typeof eventParticipants>;

export type DiscordConfig = InferSelectModel<typeof discordConfig>;
export type NewDiscordConfig = InferInsertModel<typeof discordConfig>;
