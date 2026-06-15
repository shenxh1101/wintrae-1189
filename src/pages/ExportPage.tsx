import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Download, FileSpreadsheet, FileArchive, BarChart3, TrendingUp, Users, PieChart, CheckCircle, FileText, Terminal, CalendarDays, ClipboardList, FolderTree } from 'lucide-react';
import { AFTER_SALE_TYPE_LABELS, AFTER_SALE_TYPE_COLORS, ORDER_STATUS_LABELS, REVIEWERS, type AfterSaleType } from '@/types';
import { exportToExcel, generateRenameList, exportRenameList, exportRenameBat, generateDailyReport, exportDailyReport, exportHandoverSummary, generateArchiveDirPreview } from '@/utils/fileUtils';
import { cn } from '@/lib/utils';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DateRangeFilter } from '@/components/common/DateRangeFilter';

type ArchiveGroupBy = 'order' | 'date';

export function ExportPage() {
  const { getStatistics, getDateFilteredOrders } = useAppStore();
  const stats = getStatistics();
  const filteredOrders = getDateFilteredOrders();
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [archiveGroupBy, setArchiveGroupBy] = useState<ArchiveGroupBy>('order');

  const typeChartData = Object.entries(stats.byType).map(([type, count]) => ({
    name: AFTER_SALE_TYPE_LABELS[type as keyof typeof AFTER_SALE_TYPE_LABELS],
    value: count,
    color: AFTER_SALE_TYPE_COLORS[type as keyof typeof AFTER_SALE_TYPE_COLORS],
  }));

  const reviewerStats = REVIEWERS.map((reviewer) => ({
    name: reviewer,
    处理数: filteredOrders.filter((o) => o.reviewer === reviewer).length,
  })).filter((r) => r.处理数 > 0);

  const dailyReport = useMemo(() => generateDailyReport(filteredOrders), [filteredOrders]);

  const dailyTrendChartData = useMemo(() => {
    return [...dailyReport].reverse().map((row) => ({
      date: row.date.slice(5),
      退款: row.refund,
      补发: row.reissue,
      争议: row.dispute,
      咨询: row.consult,
    }));
  }, [dailyReport]);

  const handoverPreview = useMemo(() => {
    const highRisk = filteredOrders.filter((o) => (o.isDuplicate || o.isUrgent || o.addressChanged) && o.status !== 'completed');
    const unprocessed = filteredOrders.filter((o) => o.status !== 'completed');
    const reviewerPending: Record<string, number> = {};
    for (const o of unprocessed) {
      const r = o.reviewer || '未分配';
      reviewerPending[r] = (reviewerPending[r] || 0) + 1;
    }
    return { highRiskCount: highRisk.length, unprocessedCount: unprocessed.length, reviewerPending };
  }, [filteredOrders]);

  const archiveDirPreview = useMemo(
    () => generateArchiveDirPreview(filteredOrders, archiveGroupBy),
    [filteredOrders, archiveGroupBy],
  );

  const timestamp = new Date().toISOString().slice(0, 10);

  const handleExportExcel = () => {
    setExporting(true);
    setTimeout(() => {
      exportToExcel(filteredOrders, `售后数据汇总_${timestamp}`);
      setExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    }, 500);
  };

  const handleExportByType = (type: AfterSaleType) => {
    const typeOrders = filteredOrders.filter((o) => o.type === type);
    exportToExcel(typeOrders, `${AFTER_SALE_TYPE_LABELS[type]}_${timestamp}`);
  };

  const handleExportRenameExcel = () => {
    exportRenameList(filteredOrders, `附件改名清单_${timestamp}`);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleExportRenameBat = () => {
    exportRenameBat(filteredOrders, `批量重命名_${timestamp}`);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleExportDailyReport = () => {
    exportDailyReport(filteredOrders, `统计日报_${timestamp}`);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleExportHandover = () => {
    exportHandoverSummary(filteredOrders, `交接摘要_${timestamp}`);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const renameList = generateRenameList(filteredOrders);
  const archivePreview = renameList.slice(0, 15);
  const ordersWithAttachments = filteredOrders.filter((o) => o.attachments.length > 0);

  const statCards = [
    {
      title: '总订单数',
      value: stats.total,
      icon: FileSpreadsheet,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: '已完成',
      value: stats.byStatus.completed,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: '紧急件',
      value: stats.urgentCount,
      icon: TrendingUp,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
    },
    {
      title: '重复申诉',
      value: stats.duplicateCount,
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">导出归档</h1>
          <p className="text-slate-500 text-sm mt-1">统计摘要与批量导出归档</p>
        </div>
        <DateRangeFilter />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl p-5 shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className={`${card.bgColor} p-3 rounded-xl`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-sm text-slate-500">{card.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-teal-600" />
            售后类型分布
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-1.5 mt-2">
            {typeChartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-600 flex-1">{item.name}</span>
                <span className="text-xs font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            处理状态统计
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(stats.byStatus).map(([status, count]) => ({
                  name: ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS],
                  数量: count,
                }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="数量" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {reviewerStats.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            人员处理量统计
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reviewerStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="#64748b" width={80} />
                <Tooltip />
                <Bar dataKey="处理数" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-600" />
            交接摘要
            <span className="text-sm font-normal text-slate-500 ml-2">
              方便班次交接，一键汇总
            </span>
          </h3>
          <button
            onClick={handleExportHandover}
            disabled={filteredOrders.length === 0}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filteredOrders.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700',
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出交接摘要（Excel）
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xl font-bold text-slate-700">{filteredOrders.length}</p>
            <p className="text-xs text-slate-500">总订单</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-xl font-bold text-red-700">{handoverPreview.highRiskCount}</p>
            <p className="text-xs text-red-600">异常优先单（未完成）</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xl font-bold text-amber-700">{handoverPreview.unprocessedCount}</p>
            <p className="text-xs text-amber-600">待处理</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-100">
            <p className="text-xl font-bold text-green-700">{stats.byStatus.completed}</p>
            <p className="text-xs text-green-600">已完成</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-slate-500 mb-2">分类统计</h4>
            <div className="space-y-1.5">
              {Object.entries(AFTER_SALE_TYPE_LABELS).map(([type, label]) => {
                const count = stats.byType[type as AfterSaleType];
                const completed = filteredOrders.filter((o) => o.type === type && o.status === 'completed').length;
                return (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: AFTER_SALE_TYPE_COLORS[type as AfterSaleType] }} />
                    <span className="text-slate-600 flex-1">{label}</span>
                    <span className="text-slate-800 font-semibold">{count}条</span>
                    <span className="text-green-600">已完成{completed}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-slate-500 mb-2">复核人待办</h4>
            <div className="space-y-1.5">
              {Object.entries(handoverPreview.reviewerPending)
                .sort((a, b) => b[1] - a[1])
                .map(([reviewer, count]) => (
                  <div key={reviewer} className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      reviewer === '未分配' ? 'bg-slate-300' : 'bg-teal-500',
                    )} />
                    <span className={cn('text-slate-600 flex-1', reviewer === '未分配' && 'text-slate-400 italic')}>{reviewer}</span>
                    <span className="text-slate-800 font-semibold">{count}条待处理</span>
                  </div>
                ))}
              {Object.keys(handoverPreview.reviewerPending).length === 0 && (
                <p className="text-xs text-slate-400">暂无待处理工单</p>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          交接摘要受右上角日期范围筛选控制，导出 Excel 包含总体概况、分类统计、异常优先单明细、复核人待办四个板块
        </p>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-teal-600" />
            统计日报
            <span className="text-sm font-normal text-slate-500 ml-2">
              按天汇总处理量，{dailyReport.length} 天数据
            </span>
          </h3>
          <button
            onClick={handleExportDailyReport}
            disabled={filteredOrders.length === 0}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filteredOrders.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700',
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出日报（Excel）
          </button>
        </div>

        {dailyTrendChartData.length > 1 && (
          <div className="mb-5">
            <h4 className="text-sm font-medium text-slate-600 mb-3">每日趋势</h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrendChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="退款" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="补发" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="争议" stackId="a" fill="#8B5CF6" />
                  <Bar dataKey="咨询" stackId="a" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2.5 text-left font-medium text-slate-600 whitespace-nowrap">日期</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-600">总量</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-600">退款</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-600">补发</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-600">争议</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-600">咨询</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-600">紧急</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-600">重复</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-600">地址变更</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-600">已完成</th>
                <th className="px-3 py-2.5 text-center font-medium text-slate-600">待处理</th>
              </tr>
            </thead>
            <tbody>
              {dailyReport.map((row) => (
                <tr key={row.date} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-700">{row.date}</td>
                  <td className="px-3 py-2 text-center font-semibold text-slate-800">{row.total}</td>
                  <td className="px-3 py-2 text-center text-red-600">{row.refund || '-'}</td>
                  <td className="px-3 py-2 text-center text-amber-600">{row.reissue || '-'}</td>
                  <td className="px-3 py-2 text-center text-purple-600">{row.dispute || '-'}</td>
                  <td className="px-3 py-2 text-center text-sky-600">{row.consult || '-'}</td>
                  <td className="px-3 py-2 text-center text-amber-500">{row.urgent || '-'}</td>
                  <td className="px-3 py-2 text-center text-purple-500">{row.duplicate || '-'}</td>
                  <td className="px-3 py-2 text-center text-green-600">{row.addressChanged || '-'}</td>
                  <td className="px-3 py-2 text-center text-green-700">{row.completed || '-'}</td>
                  <td className="px-3 py-2 text-center text-slate-500">{row.pending || '-'}</td>
                </tr>
              ))}
              {dailyReport.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-400">暂无数据</td>
                </tr>
              )}
              {dailyReport.length > 0 && (
                <tr className="bg-slate-100 font-semibold">
                  <td className="px-3 py-2 text-slate-700">合计</td>
                  <td className="px-3 py-2 text-center text-slate-800">{dailyReport.reduce((s, r) => s + r.total, 0)}</td>
                  <td className="px-3 py-2 text-center text-red-600">{dailyReport.reduce((s, r) => s + r.refund, 0) || '-'}</td>
                  <td className="px-3 py-2 text-center text-amber-600">{dailyReport.reduce((s, r) => s + r.reissue, 0) || '-'}</td>
                  <td className="px-3 py-2 text-center text-purple-600">{dailyReport.reduce((s, r) => s + r.dispute, 0) || '-'}</td>
                  <td className="px-3 py-2 text-center text-sky-600">{dailyReport.reduce((s, r) => s + r.consult, 0) || '-'}</td>
                  <td className="px-3 py-2 text-center text-amber-500">{dailyReport.reduce((s, r) => s + r.urgent, 0) || '-'}</td>
                  <td className="px-3 py-2 text-center text-purple-500">{dailyReport.reduce((s, r) => s + r.duplicate, 0) || '-'}</td>
                  <td className="px-3 py-2 text-center text-green-600">{dailyReport.reduce((s, r) => s + r.addressChanged, 0) || '-'}</td>
                  <td className="px-3 py-2 text-center text-green-700">{dailyReport.reduce((s, r) => s + r.completed, 0) || '-'}</td>
                  <td className="px-3 py-2 text-center text-slate-500">{dailyReport.reduce((s, r) => s + r.pending, 0) || '-'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          日报数据受右上角日期范围筛选控制，选择日期区间后仅导出该范围内的按天汇总
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-600" />
            导出数据
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleExportExcel}
              disabled={exporting || filteredOrders.length === 0}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-lg border transition-all',
                filteredOrders.length === 0
                  ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                  : exporting
                  ? 'bg-teal-50 border-teal-300'
                  : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-800">导出全部数据（{filteredOrders.length}条）</p>
                  <p className="text-xs text-slate-500">包含所有字段的完整 Excel 报表</p>
                </div>
              </div>
              {exportSuccess ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Download className="w-5 h-5 text-slate-400" />
              )}
            </button>

            <p className="text-xs text-slate-500 font-medium mt-4">按类型导出</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(AFTER_SALE_TYPE_LABELS).map(([type, label]) => {
                const count = stats.byType[type as AfterSaleType];
                return (
                  <button
                    key={type}
                    onClick={() => handleExportByType(type as AfterSaleType)}
                    disabled={count === 0}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border transition-colors text-left',
                      count === 0
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: AFTER_SALE_TYPE_COLORS[type as AfterSaleType] }}
                    />
                    <span className="text-sm text-slate-700">{label}</span>
                    <span className="text-xs text-slate-400 ml-auto">{count}条</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-teal-600" />
            附件批量改名
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            自动按照「订单号_类型_日期_序号」格式重命名附件，共 <strong>{renameList.length}</strong> 个真实附件待处理（涉及 {ordersWithAttachments.length} 个订单）
          </p>
          <div className="bg-slate-50 rounded-lg p-3 max-h-52 overflow-y-auto border border-slate-200">
            <div className="space-y-1.5">
              {archivePreview.length > 0 ? (
                archivePreview.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 flex-shrink-0 w-6 text-right">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500 truncate line-through">{item.originalName}</p>
                      <p className="text-teal-700 font-medium truncate">→ {item.newName}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  暂无真实附件数据
                </div>
              )}
              {renameList.length > archivePreview.length && (
                <p className="text-xs text-slate-400 text-center pt-2 border-t border-slate-200 mt-2">
                  ... 还有 {renameList.length - archivePreview.length} 个附件
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={handleExportRenameExcel}
              disabled={renameList.length === 0}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                renameList.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700',
              )}
            >
              <FileText className="w-4 h-4" />
              导出改名清单（Excel）
            </button>
            <button
              onClick={handleExportRenameBat}
              disabled={renameList.length === 0}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                renameList.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-700 text-white hover:bg-slate-800',
              )}
            >
              <Terminal className="w-4 h-4" />
              下载批处理脚本（.bat）
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            提示：将 .bat 脚本和附件放在同一目录下双击运行，即可自动批量重命名
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-teal-600" />
            归档目录预览
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setArchiveGroupBy('order')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                archiveGroupBy === 'order'
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              )}
            >
              按订单分组
            </button>
            <button
              onClick={() => setArchiveGroupBy('date')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                archiveGroupBy === 'date'
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              )}
            >
              按日期分组
            </button>
          </div>
        </div>

        {archiveDirPreview.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {archiveDirPreview.map((dir) => (
              <div key={dir.groupKey} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <FolderTree className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium text-slate-700">{dir.groupLabel}</span>
                  <span className="text-xs text-slate-400 ml-auto">{dir.files.length} 个附件</span>
                </div>
                <div className="px-3 py-2 space-y-1">
                  {dir.files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-500 truncate line-through flex-1">{file.originalName}</span>
                      <span className="text-slate-300">→</span>
                      <span className="text-teal-700 font-medium truncate flex-1">{file.newName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            暂无附件数据，无法生成归档目录预览
          </div>
        )}

        <p className="text-xs text-slate-400 mt-3">
          预览实际落盘后的目录结构，按订单或日期切换分组方式，提前确认附件归类是否正确
        </p>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">导出字段说明</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: '订单号', desc: '系统订单编号' },
            { label: '买家昵称', desc: '买家账号名称' },
            { label: '售后类型', desc: '自动分类结果' },
            { label: '是否紧急', desc: '紧急件标记' },
            { label: '是否重复申诉', desc: '重复申诉标记及次数' },
            { label: '地址变更', desc: '是否修改地址' },
            { label: '留言内容', desc: '买家留言全文' },
            { label: '处理建议', desc: '系统推荐方案' },
            { label: '复核人', desc: '负责处理人员' },
            { label: '人工备注', desc: '复核备注信息' },
            { label: '状态', desc: '当前处理状态' },
            { label: '创建时间', desc: '订单生成时间' },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-700">{item.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
