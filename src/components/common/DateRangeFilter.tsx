import { Calendar, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export function DateRangeFilter() {
  const { dateRange, setDateRange, resetDateRange } = useAppStore();
  const hasFilter = !!dateRange.start || !!dateRange.end;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <input
          type="date"
          value={dateRange.start || ''}
          onChange={(e) => setDateRange({ start: e.target.value || undefined })}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <span className="text-slate-400 text-sm">至</span>
        <input
          type="date"
          value={dateRange.end || ''}
          onChange={(e) => setDateRange({ end: e.target.value || undefined })}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>
      {hasFilter && (
        <button
          onClick={resetDateRange}
          className={cn(
            'inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors',
            'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          <X className="w-4 h-4" />
          清除
        </button>
      )}
      {hasFilter && (
        <span className="inline-flex items-center px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium">
          日期筛选已生效
        </span>
      )}
    </div>
  );
}
