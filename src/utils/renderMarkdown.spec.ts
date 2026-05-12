import { describe, expect, it } from 'vitest';

import { renderMarkdownToSafeHtml } from '@/utils/renderMarkdown';

describe('renderMarkdownToSafeHtml', () => {
  it('renders headings and lists', () => {
    const html = renderMarkdownToSafeHtml('### Hi\n\n- a\n- b');
    expect(html).toContain('<h3');
    expect(html).toContain('<ul');
    expect(html).toContain('a');
  });

  it('strips script tags', () => {
    const html = renderMarkdownToSafeHtml('Hello<script>alert(1)</script>');
    expect(html.toLowerCase()).not.toContain('<script');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(renderMarkdownToSafeHtml('   \n  ')).toBe('');
  });
});
