import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Search, Filter, ChevronLeft, ChevronRight, Check, X, Edit3, Save, User, Clock, MapPin, AlertTriangle, Repeat, FileText, MessageSquare, Tag, ShieldAlert, List } from 'lucide-react';
import { AFTER_SALE_TYPE_LABELS, AFTER_SALE_TYPE_COLORS, ORDER_STATUS_LABELS, REVIEWERS, type AfterSaleType, type OrderStatus, type AfterSaleOrder } from '@/types';
import { cn, formatDateTime, truncateText } from '@/lib/utils';
import { DateRangeFilter } from '@/components/common/DateRangeFilter';

type ViewMode = 'all' | 'priority';

function isHighRisk(order: AfterSaleOrder): boolean {
  return order.isDuplicate || order.isUrgent || order.addressChanged;
}

export function ReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    orders,
    filters,
    setFilters,
    resetFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    getFilteredOrders,
    updateOrder,
    selectedOrderId,
    setSelectedOrderId,
    batchAssignReviewer,
  } = useAppStore();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkText, setRemarkText] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const filteredOrders = getFilteredOrders();

  const priorityOrders = useMemo(
    () => filteredOrders.filter(isHighRisk),
    [filteredOrders],
  );

  const normalOrders = useMemo(
    () => filteredOrders.filter((o) => !isHighRisk(o)),
    [filteredOrders],
  );

  const displayOrders = viewMode === 'priority' ? priorityOrders : filteredOrders;

  const totalPages = Math.max(1, Math.ceil(displayOrders.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return displayOrders.slice(start, start + pageSize);
  }, [displayOrders, safeCurrentPage, pageSize]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setSelectedOrderId(id);
    }
  }, [searchParams, setSelectedOrderId]);

  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, [viewMode, setCurrentPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedOrders.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleOrderClick = (order: AfterSaleOrder) => {
    setSelectedOrderId(order.id);
    setRemarkText(order.remark || '');
    setEditingRemark(false);
  };

  const handleSaveRemark = () => {
    if (selectedOrderId) {
      updateOrder(selectedOrderId, { remark: remarkText });
      setEditingRemark(false);
    }
  };

  const handleStatusChange = (status: OrderStatus) => {
    if (selectedOrderId) {
      updateOrder(selectedOrderId, { status });
    }
  };

  const handleReviewerChange = (reviewer: string) => {
    if (selectedOrderId) {
      updateOrder(selectedOrderId, { reviewer, status: 'reviewing' });
    }
  };

  const handleBatchAssign = (reviewer: string) => {
    if (selectedIds.length > 0) {
      batchAssignReviewer(selectedIds, reviewer);
      setSelectedIds([]);
    }
  };

  const handleSelectAllPriority = () => {
    setSelectedIds(priorityOrders.map((o) => o.id));
  };

  const isAllSelected = paginatedOrders.length > 0 && paginatedOrders.every((o) => selectedIds.includes(o.id));

  const priorityStats = useMemo(() => {
    const dup = filteredOrders.filter((o) => o.isDuplicate).length;
    const urgent = filteredOrders.filter((o) => o.isUrgent).length;
    const addr = filteredOrders.filter((o) => o.addressChanged).length;
    return { dup, urgent, addr, total: priorityOrders.length };
  }, [filteredOrders, priorityOrders]);

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">结果复核</h1>
            <p className="text-slate-500 text-sm mt-1">
              共 {displayOrders.length} 条记录{viewMode === 'priority' ? '（异常优先队列）' : ''}，已选择 {selectedIds.length} 条
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <DateRangeFilter />
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索订单号、买家昵称..."
                value={filters.keyword || ''}
                onChange={(e) => setFilters({ keyword: e.target.value })}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent w-64"
              />
            </div>
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                showFilterPanel
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50',
              )}
            >
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setViewMode('priority')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              viewMode === 'priority'
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50',
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            异常优先
            {priorityStats.total > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold',
                viewMode === 'priority' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600',
              )}>
                {priorityStats.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              viewMode === 'all'
                ? 'bg-teal-50 border-teal-300 text-teal-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50',
            )}
          >
            <List className="w-4 h-4" />
            全部订单
            <span className={cn(
              'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold',
              viewMode === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600',
            )}>
              {filteredOrders.length}
            </span>
          </button>

          {viewMode === 'priority' && (
            <div className="flex items-center gap-3 ml-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Repeat className="w-3 h-3 text-purple-500" />
                重复 {priorityStats.dup}
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                紧急 {priorityStats.urgent}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-green-500" />
                地址变更 {priorityStats.addr}
              </span>
            </div>
          )}

          {viewMode === 'priority' && priorityOrders.length > 0 && (
            <button
              onClick={handleSelectAllPriority}
              className="ml-auto text-xs text-red-600 hover:text-red-700 font-medium"
            >
              全选异常单（{priorityStats.total}条）
            </button>
          )}
        </div>

        {showFilterPanel && (
          <div className="mb-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">售后类型</label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => setFilters({ type: (e.target.value as AfterSaleType) || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">全部类型</option>
                  {Object.entries(AFTER_SALE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">处理状态</label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ status: (e.target.value as OrderStatus) || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">全部状态</option>
                  {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">紧急件</label>
                <select
                  value={filters.isUrgent === undefined ? '' : String(filters.isUrgent)}
                  onChange={(e) =>
                    setFilters({
                      isUrgent: e.target.value === '' ? undefined : e.target.value === 'true',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">全部</option>
                  <option value="true">仅紧急件</option>
                  <option value="false">非紧急件</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">复核人</label>
                <select
                  value={filters.reviewer || ''}
                  onChange={(e) => setFilters({ reviewer: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">全部</option>
                  {REVIEWERS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={resetFilters}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                重置筛选
              </button>
            </div>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className={cn(
            'mb-4 p-3 rounded-lg border flex items-center justify-between',
            viewMode === 'priority' ? 'bg-red-50 border-red-200' : 'bg-teal-50 border-teal-200',
          )}>
            <span className={cn('text-sm', viewMode === 'priority' ? 'text-red-700' : 'text-teal-700')}>
              已选择 <strong>{selectedIds.length}</strong> 条记录
              {viewMode === 'priority' && '（异常优先队列）'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">批量分配：</span>
              {REVIEWERS.slice(0, 4).map((r) => (
                <button
                  key={r}
                  onClick={() => handleBatchAssign(r)}
                  className={cn(
                    'px-3 py-1 text-sm bg-white border rounded hover:bg-slate-50 transition-colors',
                    viewMode === 'priority' ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-teal-300 text-teal-700 hover:bg-teal-100',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">订单号</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">买家</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">类型</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">状态</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">标记</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">留言摘要</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">复核人</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => {
                  const highRisk = isHighRisk(order);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => handleOrderClick(order)}
                      className={cn(
                        'border-b cursor-pointer transition-colors',
                        selectedOrderId === order.id
                          ? 'bg-teal-50 border-teal-200'
                          : 'hover:bg-slate-50 border-slate-100',
                        order.isDuplicate && 'bg-purple-50/70',
                        !order.isDuplicate && order.isUrgent && 'bg-amber-50/50',
                        !order.isDuplicate && !order.isUrgent && order.addressChanged && 'bg-green-50/40',
                      )}
                      style={order.isDuplicate ? { boxShadow: 'inset 3px 0 0 0 #7c3aed' } : order.isUrgent ? { boxShadow: 'inset 3px 0 0 0 #f59e0b' } : order.addressChanged ? { boxShadow: 'inset 3px 0 0 0 #22c55e' } : {}}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order.id)}
                          onChange={(e) => handleSelectOne(order.id, e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-700">{order.orderNo}</span>
                          {order.isDuplicate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse">
                              <Repeat className="w-3 h-3" />
                              第{order.duplicateCount || 1}次 / 共{order.duplicateTotal || 2}次申诉
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{order.buyerName}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: AFTER_SALE_TYPE_COLORS[order.type] + '20',
                            color: AFTER_SALE_TYPE_COLORS[order.type],
                          }}
                        >
                          {AFTER_SALE_TYPE_LABELS[order.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            order.status === 'completed' && 'bg-green-100 text-green-700',
                            order.status === 'pending' && 'bg-slate-100 text-slate-600',
                            order.status === 'processing' && 'bg-blue-100 text-blue-700',
                            order.status === 'reviewing' && 'bg-amber-100 text-amber-700',
                            order.status === 'exception' && 'bg-red-100 text-red-700',
                          )}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {order.isUrgent && (
                            <AlertTriangle className="w-4 h-4 text-amber-500" aria-label="紧急件" />
                          )}
                          {order.isDuplicate && (
                            <Repeat className="w-4 h-4 text-purple-500" aria-label="重复申诉" />
                          )}
                          {order.addressChanged && (
                            <MapPin className="w-4 h-4 text-green-500" aria-label="地址变更" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs">
                        {truncateText(order.messages[order.messages.length - 1]?.content || '', 30)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {order.reviewer || <span className="text-slate-400">未分配</span>}
                      </td>
                    </tr>
                  );
                })}
                {paginatedOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      {viewMode === 'priority' ? '当前筛选条件下无异常订单' : '暂无数据'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-sm text-slate-500">
                第 {safeCurrentPage} / {totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page = i + 1;
                  if (totalPages > 5) {
                    if (safeCurrentPage > 3) {
                      page = safeCurrentPage - 2 + i;
                    }
                    if (safeCurrentPage > totalPages - 2) {
                      page = totalPages - 4 + i;
                    }
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                        safeCurrentPage === page
                          ? 'bg-teal-600 text-white'
                          : 'hover:bg-slate-200 text-slate-600',
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="w-96 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">订单详情</h3>
            <button
              onClick={() => {
                setSelectedOrderId(null);
                setSearchParams({});
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">订单号</p>
              <p className="font-mono text-sm text-slate-800">{selectedOrder.orderNo}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">买家昵称</p>
                <p className="text-sm text-slate-800">{selectedOrder.buyerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">联系电话</p>
                <p className="text-sm text-slate-800">{selectedOrder.buyerPhone || '无'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">售后类型</p>
                <span
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: AFTER_SALE_TYPE_COLORS[selectedOrder.type] + '20',
                    color: AFTER_SALE_TYPE_COLORS[selectedOrder.type],
                  }}
                >
                  {AFTER_SALE_TYPE_LABELS[selectedOrder.type]}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">处理状态</p>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                  className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                >
                  {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedOrder.isUrgent && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  紧急件
                </span>
              )}
              {selectedOrder.isDuplicate && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-semibold shadow-sm">
                  <Repeat className="w-3.5 h-3.5" />
                  重复申诉 · 第{selectedOrder.duplicateCount || 1}次 / 共{selectedOrder.duplicateTotal || 2}次
                </span>
              )}
              {selectedOrder.addressChanged && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  <MapPin className="w-3 h-3" />
                  地址变更
                </span>
              )}
            </div>

            {selectedOrder.addressChanged && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  地址变更
                </p>
                {selectedOrder.originalAddress && (
                  <p className="text-xs text-slate-500 line-through mb-1">
                    原：{selectedOrder.originalAddress}
                  </p>
                )}
                <p className="text-xs text-green-700 font-medium">
                  新：{selectedOrder.newAddress}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                留言记录 ({selectedOrder.messages.length}条)
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedOrder.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'p-2 rounded-lg text-xs',
                      msg.source === 'buyer' ? 'bg-blue-50 text-blue-800 ml-4' : 'bg-slate-100 text-slate-700 mr-4',
                    )}
                  >
                    <p className="mb-1">{msg.content}</p>
                    <p className="text-[10px] opacity-60">{formatDateTime(msg.time)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
              <p className="text-xs font-medium text-teal-700 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                处理建议
              </p>
              <p className="text-xs text-teal-800">{selectedOrder.suggestion}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">复核人</p>
              <select
                value={selectedOrder.reviewer || ''}
                onChange={(e) => handleReviewerChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              >
                <option value="">请选择复核人</option>
                {REVIEWERS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">人工备注</p>
                {editingRemark ? (
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveRemark}
                      className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
                    >
                      <Save className="w-3 h-3" />
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditingRemark(false);
                        setRemarkText(selectedOrder.remark || '');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-600 flex items-center gap-0.5"
                    >
                      <X className="w-3 h-3" />
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingRemark(true)}
                    className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    编辑
                  </button>
                )}
              </div>
              {editingRemark ? (
                <textarea
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="添加人工备注..."
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 min-h-[60px]">
                  {selectedOrder.remark || <span className="text-slate-400">暂无备注</span>}
                </div>
              )}
            </div>

            {selectedOrder.attachments.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  附件 ({selectedOrder.attachments.length})
                </p>
                <div className="space-y-1">
                  {selectedOrder.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700 truncate flex-1">{att}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
