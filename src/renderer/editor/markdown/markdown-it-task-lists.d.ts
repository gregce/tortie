/**
 * markdown-it-task-lists 2.1.1 ships no types. The surface chunk-parse.ts
 * uses is one default export in markdown-it's plugin shape. Its options
 * (`enabled`, `label`, `labelAfter`) exist upstream and are deliberately not
 * modelled: the preview draws task boxes read-only through its components
 * map, and a label wrapper would change the tree remark-gfm draws.
 */
declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it';
  const markdownItTaskLists: (md: MarkdownIt) => void;
  export default markdownItTaskLists;
}
