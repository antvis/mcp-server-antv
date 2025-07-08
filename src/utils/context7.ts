/**
 * Context7 service, used to get the latest documentation context for AntV.
 */
import type { AntVLibrary } from '../types';
import { logger } from './logger';

const CONTEXT7_BASE_URL = 'https://context7.com/api';
const CONTEXT7_TIMEOUT = 30000;

function getContext7Url(
  libraryId: string,
  topic?: string,
  tokens?: number,
): string {
  const libId = libraryId.startsWith('/') ? libraryId.slice(1) : libraryId;
  const url = new URL(`${CONTEXT7_BASE_URL}/v1/${libId}`);

  if (tokens) {
    url.searchParams.set('tokens', tokens.toString());
  }
  if (topic) {
    url.searchParams.set('topic', topic);
  }
  url.searchParams.set('type', 'txt');

  return url.toString();
}

async function fetchContext7Library(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(CONTEXT7_TIMEOUT),
      headers: { 'X-Context7-Source': 'mcp-server' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();

    if (
      !text ||
      text === 'No content available' ||
      text === 'No context data available' ||
      text.trim().length === 0
    ) {
      return null;
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout error');
    }
    throw error;
  }
}

/**
 * Get the Context7 library ID corresponding to the AntV organization.
 */
export function getLibraryId(library: AntVLibrary): string {
  return `/antvis/${library}`;
}


/**
 * Get the documentation context associated with the specified library and topic.
 */
export async function fetchLibraryDocumentation(
  libraryId: string,
  topic: string,
  tokens?: number,
): Promise<{ documentation: string | null; error?: string }> {
  try {
    const url = getContext7Url(libraryId, topic, tokens);
    const response = await fetchContext7Library(url);

    if (response) {
      logger.info(
        `Documentation fetched successfully, length: ${response.length} chars`,
      );
      return { documentation: response };
    }

    return { documentation: null };
  } catch (error) {
    logger.error('Failed to fetch documentation:', error);
    return { documentation: null, error: error instanceof Error ? error.message : String(error) };
  }
}
