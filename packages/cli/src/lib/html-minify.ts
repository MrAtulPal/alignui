function extractBlocks(html: string) {
  const blocks: string[] = [];
  const re = /<(script|style|pre)(\b[^>]*)?>[\s\S]*?<\/\1>/gi;
  const out = html.replace(re, (m) => {
    const idx = blocks.push(m) - 1;
    return `<!--__ALIGNUI_BLOCK_${idx}__-->`;
  });
  return { out, blocks };
}

function restoreBlocks(html: string, blocks: string[]) {
  return html.replace(/<!--__ALIGNUI_BLOCK_(\d+)__-->/g, (_m, i) => blocks[Number(i)] ?? "");
}

export function minifyHtmlLite(html: string): string {
  const { out, blocks } = extractBlocks(html);
  // Minify outside of style/script/pre blocks.
  let h = out;
  h = h.replace(/>\s+</g, "><");
  h = h.replace(/\s{2,}/g, " ");
  h = h.trim();
  return restoreBlocks(h, blocks);
}

