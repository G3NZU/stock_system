/**
 * Shared Supabase query field strings.
 * Centralising these prevents drift between dashboards that query the same tables.
 */

/** Fields selected from the `enquiries` table, including related item, location, and user. */
export const ENQUIRY_SELECT =
  'id, project_id, item_id, quantity, delivery_location_id, assigned_role, status, notes, created_at, requested_by, items(name), locations:delivery_location_id(name), users:requested_by(email, full_name)'
