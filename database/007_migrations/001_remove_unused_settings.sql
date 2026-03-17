-- ============================================================================
-- Migration: Remove unused venue_settings keys
-- These settings were removed from the UI and are not read anywhere in the
-- application. Safe to delete from all venues.
-- ============================================================================

DELETE FROM venue_settings
WHERE setting_key IN (
  -- Authentication (never read by API)
  'auth.otp_required_for_login',
  'auth.allow_password_login',
  'auth.otp_expiry_minutes',
  'auth.max_otp_attempts',
  'auth.otp_channels',
  'auth.session_ttl_hours',
  -- Accounts
  'account.allow_anonymous_otc_orders',
  'account.require_person_assignment_before_entry',
  -- Waivers
  'waiver.otp_required_for_signing',
  'waiver.required_for_walkin',
  'waiver.expiry_months',
  -- Ticketing
  'ticketing.max_advance_booking_days',
  'ticketing.late_entry_grace_period_minutes',
  'ticketing.max_tickets_per_online_order',
  'ticketing.cancellation_policy',
  'ticketing.cancellation_cutoff_hours',
  -- Gate
  'gate.strict_mode_enabled',
  'gate.allow_manual_override',
  'gate.exit_scan_enabled',
  'gate.offline_grace_minutes',
  -- Checkout
  'checkout.online_hold_ttl_minutes',
  'checkout.otc_hold_ttl_minutes',
  'checkout.allow_split_payment',
  -- Notifications
  'notification.booking_confirmation_channel',
  'notification.pre_visit_reminder_enabled',
  'notification.pre_visit_reminder_hours',
  -- Invoicing
  'invoice.auto_generate_on_payment',
  'invoice.number_prefix',
  'invoice.show_tax_breakdown',
  -- Reporting
  'reporting.daily_rollup_time',
  'reporting.live_headcount_enabled',
  -- Superseded till flags (replaced by till_close_mode and pos.till_mode)
  'pos.require_till',
  'pos.blind_close_enabled',
  'pos.variance_threshold',
  'pos.opening_float_default',
  'pos.cash_movement_approval_threshold'
);
