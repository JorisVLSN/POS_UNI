/**
 * MEWS POS ACADEMY — Salesforce → Supabase nightly sync
 *
 * Purpose: Pull active POS onboarding properties from Salesforce
 *          and upsert them into the Supabase `properties` table.
 *
 * How to run: Paste this prompt into a Claude scheduled task (daily).
 *
 * PROMPT TO SCHEDULE:
 * ---
 * Use the Salesforce MCP connector to query all active POS onboarding projects.
 * For each project, extract: Account Name, Salesforce ID (opportunity or account ID),
 * and the assigned Onboarding Manager email.
 * Then use the Supabase MCP to upsert these into the `properties` table
 * in my Supabase project (URL: [YOUR_SUPABASE_URL]).
 * The upsert key is `salesforce_id`.
 * Fields to write: name (Account Name), salesforce_id, onboarding_manager_email, synced_at (now).
 * Log a summary of how many records were upserted.
 * ---
 *
 * Manual Supabase upsert reference (if doing it via API directly):
 */

/*
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // Use service key for server-side writes
);

async function syncProperties(properties) {
  const rows = properties.map(p => ({
    name: p.accountName,
    salesforce_id: p.salesforceId,
    onboarding_manager_email: p.omEmail,
    synced_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('properties')
    .upsert(rows, { onConflict: 'salesforce_id' });

  if (error) {
    console.error('Sync failed:', error.message);
  } else {
    console.log(`Synced ${rows.length} properties`);
  }
}
*/

/**
 * SALESFORCE QUERY to use in the scheduled prompt:
 *
 * SELECT Id, Name, Owner.Email
 * FROM Opportunity
 * WHERE StageName NOT IN ('Closed Won', 'Closed Lost')
 * AND RecordType.Name = 'POS Onboarding'
 * ORDER BY Name
 *
 * Adjust RecordType.Name to match your actual Salesforce setup.
 * The Owner.Email maps to onboarding_manager_email.
 */
