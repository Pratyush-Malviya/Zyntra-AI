# Connect Apps Plugin

Let Claude perform real actions in 500+ apps. Handles auth and connections using Composio under the hood.

## Install

```bash
claude --plugin-dir .claude/plugins/connect-apps
```

Then run the setup:

```
/connect-apps:setup
```

## What You Get

Once installed, Claude can:
- Send emails via Gmail, Outlook
- Create issues on GitHub, GitLab, Jira, Linear
- Post messages to Slack, Discord, Teams
- Update docs in Notion, Google Docs
- Manage data in Sheets, Airtable, databases
- And 500+ more actions

## How It Works

1. Get a free API key from https://platform.composio.dev
2. Run `/connect-apps:setup` and paste your key
3. Restart Claude Code
4. First time using an app, you'll authorize via OAuth
5. Claude can now take real actions
