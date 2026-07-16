interface Chunk {
  content: string;
  chunkIndex: number;
}

/**
 * Splits input text into overlapping semantic chunks.
 *
 * @param text The normalized string content to split.
 * @param chunkSize The target character length of each chunk.
 * @param overlap The number of overlapping characters to carry over to the next chunk.
 * @returns Array of Chunk objects containing content and index.
 */
export function chunkText(
  text: string,
  chunkSize: number = 3000,
  overlap: number = 500
): Chunk[] {
  const chunks: Chunk[] = [];
  if (!text) return chunks;

  let index = 0;
  let chunkCount = 0;

  while (index < text.length) {
    let end = index + chunkSize;

    // If we've reached the end of the text, take the rest
    if (end >= text.length) {
      const content = text.slice(index).trim();
      if (content.length > 0) {
        chunks.push({ content, chunkIndex: chunkCount++ });
      }
      break;
    }

    // Define a search window for finding a natural boundary to split on
    const searchWindowStart = Math.max(index, end - overlap);
    const searchWindow = text.slice(searchWindowStart, end + 1);

    let splitPos = -1;

    // 1. Try to find a paragraph break (\n\n)
    const paragraphBreak = searchWindow.lastIndexOf("\n\n");
    if (paragraphBreak !== -1) {
      splitPos = searchWindowStart + paragraphBreak + 2;
    } else {
      // 2. Try to find a line break (\n)
      const lineBreak = searchWindow.lastIndexOf("\n");
      if (lineBreak !== -1) {
        splitPos = searchWindowStart + lineBreak + 1;
      } else {
        // 3. Try to find sentence boundaries (. , ? , ! followed by space)
        const sentenceEnd = Math.max(
          searchWindow.lastIndexOf(". "),
          searchWindow.lastIndexOf("? "),
          searchWindow.lastIndexOf("! ")
        );
        if (sentenceEnd !== -1) {
          splitPos = searchWindowStart + sentenceEnd + 2;
        } else {
          // 4. Try to find a space boundary to avoid word cutting
          const space = searchWindow.lastIndexOf(" ");
          if (space !== -1) {
            splitPos = searchWindowStart + space + 1;
          }
        }
      }
    }

    // Fallback: If no boundary separator was found, split exactly at chunkSize
    if (splitPos === -1 || splitPos <= index) {
      splitPos = end;
    }

    const content = text.slice(index, splitPos).trim();
    if (content.length > 0) {
      chunks.push({ content, chunkIndex: chunkCount++ });
    }

    // Advance index to splitPos minus the overlap to ensure context sharing
    index = Math.max(index + 1, splitPos - overlap);
  }

  return chunks;
}
