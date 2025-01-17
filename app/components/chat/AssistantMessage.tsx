import { memo } from 'react';
import { Markdown } from './Markdown';
import type { JSONValue } from 'ai';
import type { ProgressAnnotation } from '~/types/context';
import Popover from '~/components/ui/Popover';

interface AssistantMessageProps {
  content: string;
  annotations?: JSONValue[];
}

export const AssistantMessage = memo(({ content, annotations }: AssistantMessageProps) => {
  const filteredAnnotations = (annotations?.filter(
    (annotation: JSONValue) => annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
  ) || []) as { type: string; value: any } & { [key: string]: any }[];

  let progressAnnotation: ProgressAnnotation[] = filteredAnnotations.filter(
    (annotation) => annotation.type === 'progress',
  ) as ProgressAnnotation[];
  progressAnnotation = progressAnnotation.sort((a, b) => b.value - a.value);

  const usage: {
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
  } = filteredAnnotations.find((annotation) => annotation.type === 'usage')?.value;

  return (
    <div className="overflow-hidden w-full">
      <>
        <div className=" flex gap-2 items-center text-sm text-bolt-elements-textSecondary mb-2">
          {progressAnnotation.length > 0 && (
            <Popover trigger={<div className="i-ph:info" />}>{progressAnnotation[0].message}</Popover>
          )}
          {usage && (
            <div>
              Tokens: {usage.totalTokens} (prompt: {usage.promptTokens}, completion: {usage.completionTokens})
            </div>
          )}
        </div>
      </>
      <Markdown html>{content}</Markdown>
    </div>
  );
});
