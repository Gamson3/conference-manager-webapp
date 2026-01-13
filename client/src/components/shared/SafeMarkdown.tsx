"use client";
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';
import { cn } from '@/lib/utils';

const schema: Schema = {
  ...defaultSchema,
  tagNames: Array.from(
    new Set([
      ...(defaultSchema.tagNames ?? []),
      // Common markdown output
      'br',
      'hr',
      'del',
      // GFM tables
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ])
  ),
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    a: Array.from(
      new Set([
        ...(((defaultSchema.attributes?.a as string[] | undefined) ?? []) as string[]),
        'target',
        'rel',
        'title',
      ])
    ),
    th: Array.from(
      new Set([
        ...(((defaultSchema.attributes?.th as string[] | undefined) ?? []) as string[]),
        'align',
      ])
    ),
    td: Array.from(
      new Set([
        ...(((defaultSchema.attributes?.td as string[] | undefined) ?? []) as string[]),
        'align',
      ])
    ),
  },
};

type Props = {
  content: string;
  className?: string;
};

// SafeMarkdown renders user-authored markdown with GFM support and sanitization.
// Do not pass raw HTML; keep markdown only and let rehype-sanitize strip unsafe nodes/attrs.
export default function SafeMarkdown({ content, className }: Props) {
  const text = content || '';

  const base =
    'text-sm leading-relaxed ' +
    // spacing
    '[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_hr]:my-4 ' +
    // lists (Tailwind preflight removes list-style by default)
    '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 ' +
    // headings
    '[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2 ' +
    '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 ' +
    '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 ' +
    // links
    '[&_a]:underline [&_a]:underline-offset-4 ' +
    // blockquote
    '[&_blockquote]:border-l [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:my-3 ' +
    // code
    '[&_code]:font-mono [&_code]:text-[0.95em] [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:my-3 ' +
    // tables
    '[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 ' +
    '[&_th]:border [&_td]:border [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1 [&_th]:text-left';

  return (
    <div className={cn(base, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[[rehypeSanitize, schema]]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
