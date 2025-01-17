import { type Message } from 'ai';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';
import { IGNORE_PATTERNS, type FileMap } from './constants';
import ignore from 'ignore';
import type { ContextAnnotation } from '~/types/context';

export function extractPropertiesFromMessage(message: Message): { model: string; provider: string; content: string } {
  const textContent = Array.isArray(message.content)
    ? message.content.find((item) => item.type === 'text')?.text || ''
    : message.content;

  const modelMatch = textContent.match(MODEL_REGEX);
  const providerMatch = textContent.match(PROVIDER_REGEX);

  /*
   * Extract model
   * const modelMatch = message.content.match(MODEL_REGEX);
   */
  const model = modelMatch ? modelMatch[1] : DEFAULT_MODEL;

  /*
   * Extract provider
   * const providerMatch = message.content.match(PROVIDER_REGEX);
   */
  const provider = providerMatch ? providerMatch[1] : DEFAULT_PROVIDER.name;

  const cleanedContent = Array.isArray(message.content)
    ? message.content.map((item) => {
        if (item.type === 'text') {
          return {
            type: 'text',
            text: item.text?.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, ''),
          };
        }

        return item; // Preserve image_url and other types as is
      })
    : textContent.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '');

  return { model, provider, content: cleanedContent };
}

export function simplifyBoltActions(input: string): string {
  // Using regex to match boltAction tags that have type="file"
  const regex = /(<boltAction[^>]*type="file"[^>]*>)([\s\S]*?)(<\/boltAction>)/g;

  // Replace each matching occurrence
  return input.replace(regex, (_0, openingTag, _2, closingTag) => {
    return `${openingTag}\n          ...\n        ${closingTag}`;
  });
}

export function createFilesContext(files: FileMap, useRelativePath?: boolean) {
  const ig = ignore().add(IGNORE_PATTERNS);
  let filePaths = Object.keys(files);
  filePaths = filePaths.filter((x) => {
    const relPath = x.replace('/home/project/', '');
    return !ig.ignores(relPath);
  });

  const fileContexts = filePaths
    .filter((x) => files[x] && files[x].type == 'file')
    .map((path) => {
      const dirent = files[path];

      if (!dirent || dirent.type == 'folder') {
        return '';
      }

      const codeWithLinesNumbers = dirent.content
        .split('\n')
        // .map((v, i) => `${i + 1}|${v}`)
        .join('\n');

      let filePath = path;

      if (useRelativePath) {
        filePath = path.replace('/home/project/', '');
      }

      return `<file path="${filePath}">\n${codeWithLinesNumbers}\n</file>`;
    });

  return `file content format:
<codebase>${fileContexts.join('\n\n')}\n\n</codebase>
`;
}

export function extractCurrentContext(messages: Message[]) {
  const lastAssistantMessage = messages.filter((x) => x.role == 'assistant').slice(-1)[0];

  if (!lastAssistantMessage) {
    return { summary: undefined, codeContext: undefined };
  }

  let summary: ContextAnnotation | undefined;
  let codeContext: ContextAnnotation | undefined;

  if (!lastAssistantMessage.annotations?.length) {
    return { summary: undefined, codeContext: undefined };
  }

  for (let i = 0; i < lastAssistantMessage.annotations.length; i++) {
    const annotation = lastAssistantMessage.annotations[i];

    if (!annotation || typeof annotation !== 'object') {
      continue;
    }

    if (!(annotation as any).type) {
      continue;
    }

    const annotationObject = annotation as any;

    if (annotationObject.type === 'codeContext') {
      codeContext = annotationObject;
      break;
    } else if (annotationObject.type === 'chatSummary') {
      summary = annotationObject;
      break;
    }
  }

  return { summary, codeContext };
}
