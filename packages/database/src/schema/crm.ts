import { relations } from 'drizzle-orm'
import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { accounts } from './ticketing.js'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const customerActivityTypeEnum = pgEnum('customer_activity_type', [
  'purchase',
  'visit',
  'membership_start',
  'membership_cancel',
  'wallet_topup',
  'review',
  'referral',
  'waiver_signed',
])

export const segmentTypeEnum = pgEnum('segment_type', ['dynamic', 'static', 'hybrid'])

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'scheduled',
  'running',
  'completed',
  'cancelled',
])

export const campaignTriggerTypeEnum = pgEnum('campaign_trigger_type', [
  'scheduled',
  'event_based',
  'recurring',
])

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'sms',
  'push',
  'whatsapp',
])

export const alertTypeEnum = pgEnum('alert_type', [
  'device.offline',
  'capacity.threshold',
  'inventory.low_stock',
  'revenue.drop',
  'payment.failure',
])

export const alertSeverityEnum = pgEnum('alert_severity', [
  'info',
  'warning',
  'critical',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const customerActivities = pgTable('customer_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  venueId: uuid('venue_id').notNull(),
  activityType: customerActivityTypeEnum('activity_type').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
})

export const customerSegments = pgTable('customer_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  segmentType: segmentTypeEnum('segment_type').notNull().default('dynamic'),
  rules: jsonb('rules'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const customerSegmentMembers = pgTable('customer_segment_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  segmentId: uuid('segment_id')
    .notNull()
    .references(() => customerSegments.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
})

export const customerTags = pgTable('customer_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  tag: text('tag').notNull(),
  appliedBy: text('applied_by').notNull().default('system'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const customerNotes = pgTable('customer_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  venueId: uuid('venue_id').notNull(),
  note: text('note').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  templateKey: text('template_key').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const marketingCampaigns = pgTable('marketing_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  segmentId: uuid('segment_id').references(() => customerSegments.id),
  notificationTemplateId: uuid('notification_template_id').references(
    () => notificationTemplates.id
  ),
  triggerType: campaignTriggerTypeEnum('trigger_type').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  status: campaignStatusEnum('status').notNull().default('draft'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const marketingCampaignSends = pgTable('marketing_campaign_sends', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => marketingCampaigns.id),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  status: text('status').notNull().default('pending'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const alertRules = pgTable('alert_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull(),
  alertType: alertTypeEnum('alert_type').notNull(),
  thresholdValue: text('threshold_value'),
  comparisonOperator: text('comparison_operator'),
  timeWindowMinutes: text('time_window_minutes'),
  severity: alertSeverityEnum('severity').notNull().default('warning'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const alertsLog = pgTable('alerts_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertRuleId: uuid('alert_rule_id').references(() => alertRules.id),
  venueId: uuid('venue_id').notNull(),
  alertType: alertTypeEnum('alert_type').notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Relations ─────────────────────────────────────────────────────────────────

export const customerActivitiesRelations = relations(customerActivities, ({ one }) => ({
  account: one(accounts, {
    fields: [customerActivities.accountId],
    references: [accounts.id],
  }),
}))

export const customerSegmentsRelations = relations(customerSegments, ({ many }) => ({
  members: many(customerSegmentMembers),
  campaigns: many(marketingCampaigns),
}))

export const marketingCampaignsRelations = relations(marketingCampaigns, ({ one, many }) => ({
  segment: one(customerSegments, {
    fields: [marketingCampaigns.segmentId],
    references: [customerSegments.id],
  }),
  template: one(notificationTemplates, {
    fields: [marketingCampaigns.notificationTemplateId],
    references: [notificationTemplates.id],
  }),
  sends: many(marketingCampaignSends),
}))
