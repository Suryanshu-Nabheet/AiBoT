/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import type { Message } from "@/lib/types";
import { Role } from "@/lib/types";

export const DOCUMENT_ANALYSIS_START = "[[DOCUMENT_ANALYSIS]]";
export const DOCUMENT_ANALYSIS_END = "[[/DOCUMENT_ANALYSIS]]";

export type DocumentResponseSegment = {
  kind: "conversation" | "document";
  text: string;
  title?: string;
  inProgress?: boolean;
};

const DOCUMENT_ANALYSIS_OPEN_PREFIX = "[[DOCUMENT_ANALYSIS";
const DOCUMENT_ANALYSIS_TITLE_PREFIX = "[[DOCUMENT_ANALYSIS:";

/** Find an opening marker before rendering, including markers still arriving in a stream. */
export function splitDocumentResponse(
  content: string,
): DocumentResponseSegment[] {
  const segments: DocumentResponseSegment[] = [];
  let cursor = 0;
  let inDocument = false;
  let documentTitle: string | undefined;

  while (cursor < content.length) {
    const marker = inDocument ? DOCUMENT_ANALYSIS_END : DOCUMENT_ANALYSIS_START;
    const markerIndex = content.indexOf(marker, cursor);

    if (inDocument && markerIndex === -1) {
      let visibleEnd = content.length;
      for (
        let size = Math.min(marker.length - 1, content.length - cursor);
        size > 0;
        size -= 1
      ) {
        if (marker.startsWith(content.slice(content.length - size))) {
          visibleEnd -= size;
          break;
        }
      }
      const text = content.slice(cursor, visibleEnd);
      if (text) {
        segments.push({
          kind: inDocument ? "document" : "conversation",
          text,
          ...(documentTitle ? { title: documentTitle } : {}),
          ...(inDocument ? { inProgress: true } : {}),
        });
      }
      break;
    }

    if (!inDocument) {
      const legacyStartIndex = content.indexOf(DOCUMENT_ANALYSIS_START, cursor);
      const titledStartIndex = content.indexOf(
        DOCUMENT_ANALYSIS_TITLE_PREFIX,
        cursor,
      );
      const startIndex = [legacyStartIndex, titledStartIndex]
        .filter((index) => index >= 0)
        .sort((left, right) => left - right)[0];

      if (startIndex === undefined) {
        let visibleEnd = content.length;
        for (
          let size = Math.min(
            DOCUMENT_ANALYSIS_OPEN_PREFIX.length - 1,
            content.length - cursor,
          );
          size > 0;
          size -= 1
        ) {
          if (
            DOCUMENT_ANALYSIS_OPEN_PREFIX.startsWith(
              content.slice(content.length - size),
            )
          ) {
            visibleEnd -= size;
            break;
          }
        }
        const text = content.slice(cursor, visibleEnd);
        if (text) segments.push({ kind: "conversation", text });
        break;
      }

      const beforeMarker = content.slice(cursor, startIndex);
      if (beforeMarker) {
        segments.push({ kind: "conversation", text: beforeMarker });
      }

      if (startIndex === titledStartIndex) {
        const titleStart = startIndex + DOCUMENT_ANALYSIS_TITLE_PREFIX.length;
        const markerEnd = content.indexOf("]]", titleStart);
        if (markerEnd === -1) break;
        documentTitle =
          content.slice(titleStart, markerEnd).trim() || undefined;
        cursor = markerEnd + 2;
      } else {
        documentTitle = undefined;
        cursor = startIndex + DOCUMENT_ANALYSIS_START.length;
      }
      inDocument = true;
      continue;
    }

    const text = content.slice(cursor, markerIndex);
    if (text) {
      segments.push({
        kind: "document",
        text,
        ...(documentTitle ? { title: documentTitle } : {}),
      });
    }
    cursor = markerIndex + marker.length;
    inDocument = false;
    documentTitle = undefined;
  }

  return segments;
}

export const DOCUMENT_WORK_INSTRUCTION = `Analyze supplied material carefully and answer the user's request. Use clear, useful Markdown and choose a structure that fits the task.

Deliverable formatting:
- Use a Document analysis card only when the user explicitly asks you to create a deliverable such as a research report or paper, brief, summary, study notes, spreadsheet-style analysis, memo, guide, or plan. Requests to do research or prepare a report count. Merely attaching a file, asking a question about it, or asking for a conversational explanation does not.
- For a requested deliverable, choose a concise, specific title that names the actual deliverable (for example, Research Brief, Study Notes, or Findings and Recommendations). Wrap only the complete deliverable in the opening marker "[[DOCUMENT_ANALYSIS: your title]]" and ${DOCUMENT_ANALYSIS_END}, each on its own line. Do not use "Document analysis" as the title. These markers are display controls and must never be shown as part of the prose.
- Put any short conversational introduction before the opening marker. Put conversational context, caveats, or a closing thought after the closing marker. The deliverable can start and end midway through a response.
- On follow-up turns, emit a card only when the user explicitly requests a new or revised deliverable. Answer ordinary follow-up questions as normal conversation. Never leave a marker open across turns.
- Do not include the markers for an ordinary answer, even when files are attached.

- For briefs, summaries, study notes, and research papers, surface the central idea, key findings or arguments, supporting evidence, and relevant limitations or open questions. Scale the detail to the request.
- For spreadsheets, identify the relevant sheets and fields, summarize meaningful patterns and outliers, and use Markdown tables for comparisons or extracted data. State assumptions and show calculations when useful.
- For images, scans, and other visual material, describe only what can be read or observed; say when text or evidence is unclear.
- Keep conclusions grounded in the supplied material. Do not invent facts, quotations, page numbers, sources, or calculations. Distinguish document facts from your own interpretation.
- Answer follow-up questions using the same supplied context. Do not force a summary when the user asks for a specific answer.`;

const DOCUMENT_INTENT =
  /\b(summary|summarize|summarise|brief|study notes?|research|research paper|paper|spreadsheet|workbook|sheet|extract|key findings|key takeaways|meeting notes?|analy[sz]e (?:this|these|the attached|the document|the file)|document review|report|memo|guide|plan)\b/i;

const DELIVERABLE_ACTION =
  /\b(create|make|write|draft|prepare|generate|produce|compile|summari[sz]e|extract|analy[sz]e|research|revise|rewrite|update|expand|shorten|give me|i need|i want|i(?:'d| would) like|turn .{0,24} into)\b/i;
const DELIVERABLE_TYPE =
  /\b(summar(?:y|ies|i[sz](?:e|ation))|brief|notes?|research(?: paper| report)?|paper|spreadsheet|workbook|sheet|report|memo|guide|plan|analysis|key findings|key takeaways|meeting notes?|(?:key )?(?:data|details|information|dates|deadlines))\b/i;

/** True only when the latest user turn asks for a document-like deliverable. */
export function isExplicitDocumentDeliverableRequest(content: string) {
  return DELIVERABLE_ACTION.test(content) && DELIVERABLE_TYPE.test(content);
}

export function isDocumentWorkRequest(
  content: string,
  attachments: readonly unknown[] = [],
) {
  return attachments.length > 0 || DOCUMENT_INTENT.test(content);
}

export function messageStartsDocumentWork(message: Message) {
  return (
    message.role === Role.User &&
    isDocumentWorkRequest(message.content ?? "", message.attachments ?? [])
  );
}
