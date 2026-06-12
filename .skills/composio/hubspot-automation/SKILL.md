---
name: hubspot-automation
description: Sync leads, contacts, companies, and deals between Zyntra-AI and HubSpot CRM
---

# HubSpot Automation (via Composio)

Automate HubSpot CRM operations via Composio MCP. Used for syncing Zyntra-AI outreach data with HubSpot, managing contacts, deals, and pipelines.

## Key Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `create_contact` | Create a contact | `email`, `properties` (firstname, lastname, phone, company) |
| `search_contacts` | Search contacts | `query` |
| `update_contact` | Update contact | `contact_id`, `properties` |
| `create_deal` | Create a deal | `dealname`, `amount`, `pipeline`, `dealstage`, `associated_contact_ids` |
| `update_deal_stage` | Move deal stage | `deal_id`, `dealstage` |
| `get_pipelines` | List pipelines | (none) |

## Zyntra-AI Integration

```typescript
// Sync a qualified lead from Zyntra-AI to HubSpot
import { createHubSpotContact } from '../../services/composio';

await createHubSpotContact('lead@company.com', {
  firstname: lead.firstName,
  lastname: lead.lastName,
  company: lead.company,
  phone: lead.phone,
  zyntra_campaign_id: campaign.id,
  lead_status: 'qualified',
});
```

## Pipeline Stages (Zyntra-AI Default)
1. New Lead → 2. Contacted → 3. Qualified → 4. Demo Scheduled → 5. Proposal → 6. Closed Won / Lost

## Best Practices
- Create contacts before creating deals (associate by email)
- Use custom properties prefixed with `zyntra_` for sync tracking
- Batch create/update for bulk operations
- Sync daily via cron or after each campaign sequence
