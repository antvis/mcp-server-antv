# MCP Server AntV ![](https://badge.mcpx.dev?type=server 'MCP Server') [![npm Version](https://img.shields.io/npm/v/@antv/mcp-server-antv.svg)](https://www.npmjs.com/package/@antv/mcp-server-antv) [![smithery badge](https://smithery.ai/badge/@antvis/mcp-server-antv)](https://smithery.ai/server/@antvis/mcp-server-antv) [![npm License](https://img.shields.io/npm/l/@antv/mcp-server-antv.svg)](https://www.npmjs.com/package/@antv/mcp-server-antv)

> A **Model Context Protocol (MCP)** server designed for AI development and QA that provides **AntV** documentation context and code examples using the latest APIs.

<img width="768" alt="mcp-server-antv Technical Architecture" src="https://mdn.alipayobjects.com/huamei_qa8qxu/afts/img/A*WHSOR7L8U0YAAAAATjAAAAgAemJ7AQ/fmt.webp" />

<a href="https://glama.ai/mcp/servers/@antvis/mcp-server-antv">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@antvis/mcp-server-antv/badge" alt="Server AntV MCP server" />
</a>

Supports **G2**, **G6**, and **F2** libraries for declarative visualization workflows, and **S2**, **X6**, and **L7** on the way～

## ✨ Features

- ✅ **AntV 5.x Compatibility**: Leverages the latest APIs for performance and modularity.
- 🧩 **Multi-Library Support**: G2 (2D charts), G6 (graph/networks), and F2 (mobile charts).
- 🔍 **Smart Intent Extraction**: Detects library usage and task complexity via `extract_antv_topic`.
- 📚 **Contextual Documentation**: Fetches relevant AntV docs and code snippets with `query_antv_document`.

## 🛠️ Quick Start

### Requirements

- Node.js >= v18.0.0
- Cursor, VSCode, Cline, Claude Desktop or another MCP Client.

### Connect to Cursor

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=mcp-server-antv&config=eyJjb21tYW5kIjoibnB4IC15IEBhbnR2L21jcC1zZXJ2ZXItYW50diJ9)

Go to: `Settings` -> `Cursor Settings` -> `MCP` -> `Add new global MCP server`

```json
{
  "mcpServers": {
    "mcp-server-antv": {
      "command": "npx",
      "args": ["-y", "@antv/mcp-server-antv"]
    }
  }
}
```

On Window system:

```json
{
  "mcpServers": {
    "mcp-server-antv": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@antv/mcp-server-antv"]
    }
  }
}
```

### Connect to VSCode

[![Install in VSCode](https://img.shields.io/badge/Install%20in-VSCode-2C2C2C?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%22%3A%22mcp-server-antv%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40antv%2Fmcp-server-antv%22%5D%7D)

Pasting the following configuration into your VSCode `~/.vscode/mcp.json` file is the recommended approach.

```json
{
  "servers": {
    "mcp-server-antv": {
      "command": "npx",
      "args": ["-y", "@antv/mcp-server-antv"]
    }
  }
}
```

or command-line configuration

```bash
code --add-mcp "{\"name\":\"mcp-server-antv\",\"command\": \"npx\",\"args\": [\"-y\",\"@antv/mcp-server-antv\"]}"
```

## 🧪 Example Workflow

An example workflow.

## 🧰 Tools Overview

| Tool                  | Functionality                                                                |
| --------------------- | ---------------------------------------------------------------------------- |
| `extract_antv_topic`  | Extract user intent, detects library (G2/G6/F2), and infers task complexity. |
| `query_antv_document` | fetch latest documentation and code examples with context7                   |

## 🔨 Contributing

Clone the repo

```bash
git clone https://github.com/antvis/mcp-server-chart.git
cd mcp-server-chart
```

Install dependencies:

```bash
npm install
```

Build the server:

```bash
npm run build
```

Start the MCP server:

```bash
npm run start
```

## 📄 License

MIT@[AntV](https://github.com/antvis).