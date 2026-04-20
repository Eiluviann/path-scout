# Path Scout\*

**The shortest path between you and your tools**

*\*cookies not included*

---

Path Scout turns your browser address bar into a smart navigation system. Define routes once, type short commands, land exactly where you need to be — every time.

```
dev/incident?active=true  →  https://myinstance-dev.service-now.com/incident_list.do?sysparm_query=active%3Dtrue
gh/my-org/my-repo         →  https://github.com/my-org/my-repo
jira/PROJ-123             →  https://mycompany.atlassian.net/browse/PROJ-123
```

No more copying URLs. No more clicking through tabs. Just type where you want to go.

---

## ⚡ How it works

Path Scout runs a lightweight local server. Register it as a custom search engine in your browser, and your address bar becomes a command line for your tools.

Type a command → Path Scout matches it against your routes → redirects you instantly.

---

## 📦 Installation

**Via npm:**
```bash
npm install -g path-scout
```

**Via Homebrew:**
```bash
brew install path-scout
```

---

## 🚀 Quick start

The fastest way to get going is with a recipe — a curated setup for a popular tool that installs plugins and generates a config with sensible default routes.

```bash
path-scout recipe apply
```

Follow the wizard, answer a few questions, then start the server:

```bash
path-scout start
```

Then register Path Scout as a search engine in your browser — see [Browser setup](#-browser-setup) below.

---

## 🌐 Browser setup

### Chrome / Arc / Brave

1. Go to **Settings → Search engine → Manage search engines**
2. Click **Add**
3. Fill in:
   - **Name:** Path Scout
   - **Shortcut:** `ps` (or anything you like)
   - **URL:** `http://localhost:7000/go?q=%s`
4. Set it as default or use the shortcut to activate it

### Firefox

1. Navigate to `http://localhost:7000/opensearch.xml`
2. Click the search bar — a prompt to add Path Scout will appear
3. Add it and set it as default

### Safari

Safari does not support custom search engines directly. Use an extension like [Choosy](https://www.choosyapp.com/) to route searches to Path Scout.

---

## 🛠 CLI reference

```
path-scout start                  Start the server (foreground)
path-scout stop                   Stop the background service
path-scout restart                Restart the background service
path-scout status                 Show whether the server is running
path-scout add <plugin>           Install a plugin
path-scout remove <plugin>        Uninstall a plugin
path-scout init                   Scaffold a new config file
path-scout recipe list            List available recipes
path-scout recipe apply           Apply a recipe via interactive wizard
path-scout recipe apply <name>    Apply a specific recipe directly
```

---

## 🔌 Official plugins

| Plugin | Description |
|--------|-------------|
| `@path-scout/plugin-servicenow` | Navigate ServiceNow instances — tables, records, portals and more |

---

## 📖 Documentation

Full documentation is available in the [wiki](../../wiki):

- [Configuration](../../wiki/Configuration) — config file structure, port, plugins
- [Routes](../../wiki/Routes) — defining paths, intermediate nodes, declaration order
- [Wildcards](../../wiki/Wildcards) — core wildcards, plugin wildcards, mixed segments
- [Args](../../wiki/Args) — mapping captured values and static strings to action params
- [Plugins](../../wiki/Plugins) — installing plugins, writing your own
- [Recipes](../../wiki/Recipes) — what recipes are, writing your own
- [Service management](../../wiki/Service-management) — running as a background service on macOS and Linux
- [Usage statistics](../../wiki/Usage-statistics) — local SQLite stats and OpenSearch suggestions
- [Troubleshooting](../../wiki/Troubleshooting) — common issues and fixes

---

## 🤝 Contributing

Contributions are welcome. Please open an issue before submitting a pull request so we can discuss the approach.

---

## 📄 License

AGPL v3
