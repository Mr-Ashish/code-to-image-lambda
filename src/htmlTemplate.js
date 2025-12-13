/**
 * HTML Template Builder
 * Converts Shiki-highlighted code into standalone HTML with inlined CSS
 */

function buildHtmlTemplate(highlightedCode, options = {}) {
  const {
    background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding = 64,
    showLineNumbers = true,
    showWindowControls = true
  } = options

  const windowControlsHtml = showWindowControls ? `
    <div class="window-controls">
      <div class="dot dot-red"></div>
      <div class="dot dot-yellow"></div>
      <div class="dot dot-green"></div>
    </div>
  ` : ''

  const lineNumberClass = showLineNumbers ? 'show-line-numbers' : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      display: inline-block;
      background: transparent;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .code-window {
      border-radius: 12px;
      display: inline-block;
      min-width: 600px;
      background: ${background};
      padding: ${padding}px;
    }

    .code-card {
      background: #1e1e1e;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .window-controls {
      display: flex;
      gap: 8px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.2);
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .dot-red {
      background: #ff5f56;
    }

    .dot-yellow {
      background: #ffbd2e;
    }

    .dot-green {
      background: #27c93f;
    }

    .code-content {
      position: relative;
      min-height: 50px;
    }

    .code-display {
      position: relative;
    }

    .code-display pre {
      margin: 0 !important;
      padding: 20px !important;
      background: transparent !important;
      overflow-x: auto;
    }

    .code-display code {
      font-family: 'Fira Code', 'Monaco', 'Cascadia Code', 'Courier New', monospace !important;
      font-size: 14px !important;
      line-height: 1.5 !important;
    }

    /* Line numbers via CSS counter */
    .show-line-numbers .code-display pre {
      counter-reset: line;
    }

    .show-line-numbers .code-display code .line::before {
      counter-increment: line;
      content: counter(line);
      display: inline-block;
      width: 2em;
      margin-right: 1em;
      text-align: right;
      color: #666;
      user-select: none;
    }
  </style>
</head>
<body>
  <div class="code-window">
    <div class="code-card">
      ${windowControlsHtml}
      <div class="code-content">
        <div class="code-display ${lineNumberClass}">
          ${highlightedCode}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

module.exports = { buildHtmlTemplate }
