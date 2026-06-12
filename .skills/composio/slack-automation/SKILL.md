---
name: slack-automation
description: Post outreach notifications, deal updates, and team alerts to Slack
---

# Slack Automation (via Composio)

Automate Slack messaging via Composio MCP. Used for real-time notifications of campaign activity, deal updates, and team collaboration.

## Key Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `post_message` | Send a message | `channel`, `text`, `thread_ts?` |
| `post_ephemeral` | Send ephemeral message | `channel`, `user`, `text` |
| `create_channel` | Create a channel | `name`, `is_private?` |
| `list_channels` | List channels | `types?` (public_channel, private_channel) |
| `search_messages` | Search messages | `query` |

## Zyntra-AI Integration

```typescript
// Notify team when a lead converts
import { createSlackMessage } from '../../services/composio';

await createSlackMessage(
  '#deals-won',
  `🎯 *New Deal Closed!*\n• Lead: ${lead.name}\n• Company: ${lead.company}\n• Value: $${deal.value}\n• Campaign: ${campaign.name}`
);
```

## Channels (Zyntra-AI Default)
- `#outreach-campaigns` - Campaign launches and updates
- `#deals-won` - Closed-won notifications
- `#lead-alerts` - High-value lead detection
- `#sdr-daily` - SDR daily summaries
- `#manager-approvals` - Content approval requests

## Best Practices
- Use blocks/attachments for rich formatting
- Thread replies for follow-up info
- Rate limit: 1 message per second per channel
- Use ephemeral messages for user-specific alerts
