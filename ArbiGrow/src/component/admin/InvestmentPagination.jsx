import { ChevronLeft, ChevronRight } from 'lucide-react';

export function InvestmentPagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
}) {
  if (totalItems === 0) return null;

  return (
    <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
      
      <div className="text-sm text-gray-400">
        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} investments
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="px-4 py-2 text-sm text-gray-400">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}