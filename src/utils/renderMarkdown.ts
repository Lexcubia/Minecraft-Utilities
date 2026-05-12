import DOMPurify from 'dompurify';
import { marked } from 'marked';

let domPurifyHooksInstalled = false;

function ensureDomPurifyLinkHook(): void {
  if (domPurifyHooksInstalled) return;
  domPurifyHooksInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element) || node.tagName !== 'A') return;
    const href = node.getAttribute('href');
    if (href && /^https?:\/\//i.test(href)) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * 将 Markdown 转为可安全用于 `v-html` 的 HTML（DOMPurify 清洗；外链 `target=_blank`）。
 */
export function renderMarkdownToSafeHtml(markdown: string): string {
  ensureDomPurifyLinkHook();
  const trimmed = markdown.trim();
  if (!trimmed) return '';
  const raw = marked.parse(trimmed, { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
