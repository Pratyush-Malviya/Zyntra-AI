---
name: linkedin-automation
description: Research prospects, search profiles, and manage LinkedIn outreach
---

# LinkedIn Automation (via Composio)

Automate LinkedIn tasks via Composio MCP. Used for prospect research, profile enrichment, and social selling.

## Key Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `search_profiles` | Search LinkedIn profiles | `keywords`, `location?`, `industry?`, `page_size?` |
| `get_profile` | Get profile details | `profile_id` |
| `create_post` | Create a post | `text`, `media_urls?` |
| `get_company_info` | Get company info | `company_id` |
| `search_jobs` | Search jobs | `keywords`, `location?` |

## Zyntra-AI Integration

```typescript
// Enrich a lead with LinkedIn profile data
import { searchLinkedInProfiles } from '../../services/composio';

const profiles = await searchLinkedInProfiles(
  `"${lead.title}" "${lead.company}"`
);
```

## Best Practices
- Use `page_size: 5` for focused searches
- Combine with company info for ICP research
- Respect LinkedIn's rate limits (100 requests/day)
- Don't automate connection requests or messaging (ToS)
- Use for public profile data enrichment only
