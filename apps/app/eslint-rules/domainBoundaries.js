import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Code outside a domain imports it only through its index.ts (its public API):
 * `../../domains/posts`, never `../../domains/posts/hooks/useFeed/useFeed`.
 * Inside a domain, files import each other directly, never through their own
 * index (that's how import cycles start).
 */
export const domainBoundaries = {
  meta: {
    type: 'problem',
    messages: {
      deepImport: "Import from the '{{domain}}' domain's index ({{index}}), not from inside it.",
      ownIndex: "Inside the '{{domain}}' domain, import the file directly, not through the domain's index.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    const domainsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/domains');
    const domainOf = (file) => {
      const relative = path.relative(domainsDir, file);
      return relative.startsWith('..') || path.isAbsolute(relative) ? null : relative.split(path.sep)[0];
    };
    const fromDomain = domainOf(filename);

    function check(node) {
      const source = node.source?.value;
      if (typeof source !== 'string' || !source.startsWith('.')) {
        return;
      }
      const target = path.resolve(path.dirname(filename), source);
      const domain = domainOf(target);
      if (!domain) {
        return;
      }
      const domainDir = path.join(domainsDir, domain);
      const isIndex = target === domainDir || target === path.join(domainDir, 'index');
      if (domain === fromDomain) {
        if (isIndex && path.basename(filename, path.extname(filename)) !== 'index') {
          context.report({ node: node.source, messageId: 'ownIndex', data: { domain } });
        }
        return;
      }
      if (isIndex) {
        return;
      }
      const index = path.relative(path.dirname(filename), domainDir).split(path.sep).join('/');
      context.report({ node: node.source, messageId: 'deepImport', data: { domain, index: index.startsWith('.') ? index : `./${index}` } });
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};
