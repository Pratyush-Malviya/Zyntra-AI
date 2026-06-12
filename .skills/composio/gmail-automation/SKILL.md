---
name: gmail-automation
description: Send, search, and manage Gmail emails for sales outreach campaigns
---

# Gmail Automation (via Composio)

Automate Gmail tasks via Composio MCP. Used for sending sales outreach emails, managing labels, searching conversations, and tracking replies.

## Key Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `send_email` | Send an email | `to`, `subject`, `body`, `cc?`, `bcc?` |
| `search_emails` | Search emails | `query` (Gmail search syntax) |
| `get_email` | Get email by ID | `email_id` |
| `list_labels` | List all labels | (none) |
| `create_label` | Create a new label | `name`, `color?` |
| `modify_email_labels` | Add/remove labels | `email_id`, `add_label_ids?`, `remove_label_ids?` |

## Zyntra-AI Integration

```typescript
// Example: Send personalized outreach from an SDR campaign
import { sendEmail } from '../../services/composio';

await sendEmail(
  'lead@company.com',
  'Quick question about your tech stack',
  'Hi {{lead.firstName}},\n\nI noticed your team is using...',
  'gmail'
);
```

## Best Practices
- Use templates for outreach emails (personalize with lead data)
- Always BCC the campaign tracking address
- Search by label `SENT` to track sent emails
- Use `newer_than:7d` in search queries for recent emails
- Rate limit: 100 emails per day for free tier
