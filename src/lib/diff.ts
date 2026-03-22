/**
 * Git diff utilities for displaying file changes in the session log.
 */

export interface DiffLine {
  type: 'context' | 'add' | 'remove';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface FileDiff {
  filePath: string;
  lines: DiffLine[];
  isNewFile?: boolean;
  isFullRewrite?: boolean;
}

/**
 * Generate a diff for an edit_file operation (old_text vs new_text).
 */
export function generateEditDiff(
  filePath: string,
  oldText: string,
  newText: string
): FileDiff {
  const lines: DiffLine[] = [];
  
  // Split by lines for the diff
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  // For simplicity, we'll show the entire old and new sections
  // In a real diff, you'd use a proper LCS algorithm
  
  // Add removed lines
  oldLines.forEach((line) => {
    lines.push({
      type: 'remove',
      content: line,
    });
  });
  
  // Add new lines
  newLines.forEach((line) => {
    lines.push({
      type: 'add', 
      content: line,
    });
  });
  
  return {
    filePath,
    lines,
  };
}

/**
 * Generate a diff for a write_file operation (show all content as additions).
 */
export function generateWriteDiff(
  filePath: string,
  content: string,
  isNewFile: boolean = false
): FileDiff {
  const lines: DiffLine[] = [];
  
  const contentLines = content.split('\n');
  
  // If it's a full rewrite of an existing file and content is large,
  // show a summary instead of the full diff
  if (!isNewFile && contentLines.length > 50) {
    lines.push({
      type: 'context',
      content: `File rewritten with ${contentLines.length} lines`,
    });
    
    // Show first few lines
    contentLines.slice(0, 5).forEach((line) => {
      lines.push({
        type: 'add',
        content: line,
      });
    });
    
    if (contentLines.length > 10) {
      lines.push({
        type: 'context', 
        content: `... ${contentLines.length - 10} more lines ...`,
      });
    }
    
    // Show last few lines
    if (contentLines.length > 5) {
      contentLines.slice(-5).forEach((line) => {
        lines.push({
          type: 'add',
          content: line,
        });
      });
    }
    
    return {
      filePath,
      lines,
      isFullRewrite: true,
    };
  }
  
  // For new files or small rewrites, show all content
  contentLines.forEach((line) => {
    lines.push({
      type: 'add',
      content: line,
    });
  });
  
  return {
    filePath,
    lines,
    isNewFile,
  };
}

/**
 * Format a FileDiff as a readable text diff block.
 */
export function formatDiff(diff: FileDiff): string {
  const header = diff.isNewFile
    ? `+++ ${diff.filePath} (new file)`
    : diff.isFullRewrite
    ? `±±± ${diff.filePath} (rewritten)`
    : `@@@ ${diff.filePath}`;
    
  const diffLines = diff.lines
    .map((line) => {
      const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
      return `${prefix} ${line.content}`;
    })
    .join('\n');
    
  return `${header}\n${diffLines}`;
}