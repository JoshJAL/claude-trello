import type { FileDiff } from "#/lib/diff";

interface DiffViewerProps {
  diff: FileDiff;
}

export function DiffViewer({ diff }: DiffViewerProps) {
  return (
    <div className="mt-2 rounded-lg bg-gray-900 p-3 text-sm font-mono">
      {/* File header */}
      <div className="mb-2 text-gray-400">
        {diff.isNewFile && (
          <span className="text-green-400">+++ {diff.filePath} (new file)</span>
        )}
        {diff.isFullRewrite && (
          <span className="text-yellow-400">±±± {diff.filePath} (rewritten)</span>
        )}
        {!diff.isNewFile && !diff.isFullRewrite && (
          <span className="text-blue-400">@@@ {diff.filePath}</span>
        )}
      </div>
      
      {/* Diff lines */}
      <div className="space-y-0.5">
        {diff.lines.map((line, index) => (
          <div
            key={index}
            className={`${
              line.type === 'add' 
                ? 'bg-green-900/30 text-green-300' 
                : line.type === 'remove'
                ? 'bg-red-900/30 text-red-300'
                : 'text-gray-400'
            } px-2 py-0.5`}
          >
            <span className="select-none mr-2">
              {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
            </span>
            <span className="whitespace-pre">{line.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}