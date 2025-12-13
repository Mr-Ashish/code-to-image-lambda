/**
 * SVG Generator
 * Generates SVG images without browser (pure Node.js string manipulation)
 * Fast and lightweight - no Puppeteer needed
 */

function generateSVG(htmlContent, options = {}) {
  const { width = 1200, height = 800 } = options;

  // Extract styles from head section
  const styleMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/i);
  const styles = styleMatch ? styleMatch[1] : '';

  // Extract body content (everything inside body tags)
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;

  // Wrap HTML content in SVG foreignObject
  // Note: foreignObject requires XHTML namespace for proper rendering
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}"
     height="${height}"
     viewBox="0 0 ${width} ${height}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <style>
        ${styles}
      </style>
      ${bodyContent}
    </div>
  </foreignObject>
</svg>`;

  return svg;
}

module.exports = { generateSVG };
