// Text chunking utilities
export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export class TextChunker {
  private _defaultOptions: Required<ChunkOptions> = {
    chunkSize: 500,
    chunkOverlap: 50,
    separators: ['\n\n', '\n', '. ', ' '],
  };

  constructor(private _options: ChunkOptions = {}) {
    this._options = { ...this._defaultOptions, ..._options };
  }

  chunk(text: string): string[] {
    const { chunkSize, chunkOverlap, separators } = { ...this._defaultOptions, ...this._options };
    const chunks: string[] = [];

    // If text is shorter than chunk size, return it as a single chunk
    if (text.length <= chunkSize) {
      return [text];
    }

    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      let chunkEnd = endIndex;

      // Try to find a natural breaking point
      if (endIndex < text.length) {
        let foundSeparator = false;

        for (const separator of separators) {
          const lastSeparatorIndex = text.lastIndexOf(separator, endIndex);

          if (lastSeparatorIndex > startIndex) {
            chunkEnd = lastSeparatorIndex + separator.length;
            foundSeparator = true;
            break;
          }
        }

        // If no separator found, break at word boundary
        if (!foundSeparator) {
          const lastSpaceIndex = text.lastIndexOf(' ', endIndex);

          if (lastSpaceIndex > startIndex) {
            chunkEnd = lastSpaceIndex + 1;
          }
        }
      }

      // Add the chunk
      chunks.push(text.slice(startIndex, chunkEnd).trim());

      // Move start index considering overlap
      startIndex = chunkEnd - chunkOverlap;
    }

    // Filter out empty chunks and those that are only whitespace
    return chunks.filter((chunk) => chunk.trim().length > 0);
  }
}
