import Prism from 'prismjs';

// Load language components
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-diff';
// HTML and XML both use Prism's 'markup' language component

const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  powershell: 'powershell',
  ps1: 'powershell',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  json: 'json',
  markdown: 'markdown',
  md: 'markdown',
  html: 'markup',
  xml: 'markup',
  css: 'css',
  cpp: 'cpp',
  c: 'c',
  csharp: 'csharp',
  cs: 'csharp',
  java: 'java',
  rust: 'rust',
  rs: 'rust',
  go: 'go',
  php: 'php',
  ruby: 'ruby',
  rb: 'ruby',
  diff: 'diff',
  patch: 'diff',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function highlightCode(code: string, language: string): string {
  if (!code) return '';
  const langKey = (language || 'plaintext').toLowerCase();
  const prismLangName = LANGUAGE_MAP[langKey];

  if (prismLangName && Prism.languages[prismLangName]) {
    try {
      return Prism.highlight(code, Prism.languages[prismLangName], prismLangName);
    } catch (err) {
      console.warn('Prism highlighting failed for', language, err);
    }
  }

  return escapeHtml(code);
}
