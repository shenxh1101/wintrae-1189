import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Download, FileSpreadsheet, FileArchive, BarChart3, TrendingUp, Users, PieChart, CheckCircle, FileText, Terminal } from 'lucide-react';
import { AFTER_SALE_TYPE_LABELS, AFTER_SALE_TYPE_COLORS, ORDER_STATUS_LABELS, REVIEWERS, type AfterSaleType } from '@/types';
import { exportToExcel, generateRenameList, exportRenameList, exportRenameBat } from '@/utils/fileUtils';
import { cn } from '@/lib/utils';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { DateRangeFilter } from '@/components/common/DateRangeFilter';

export function ExportPage() {
  const { getStatistics, getDateFilteredOrders } = useAppStore();
  const stats = getStatistics();
  const filteredOrders = getDateFilteredOrders();
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const typeChartData = Object.entries(stats.byType).map(([type, count]) => ({
    name: AFTER_SALE_TYPE_LABELS[type as keyof typeof AFTER_SALE_TYPE_LABELS],
    value: count,
    color: AFTER_SALE_TYPE_COLORS[type as keyof typeof AFTER_SALE_TYPE_COLORS],
  }));

  const reviewerStats = REVIEWERS.map((reviewer) => ({
    name: reviewer,
    处理数: filteredOrders.filter((o) => o.reviewer === reviewer).length,
  })).filter((r) => r.处理数 > 0);

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

  const archivePreview = generateRenameList(filteredOrders).slice(0, 15);

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
            自动按照「订单号_类型_日期_序号」格式重命名附件，共 {archivePreview.length > 0 ? generateRenameList(filteredOrders).length : 0} 个文件待处理
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
                  暂无数据
                </div>
              )}
              {generateRenameList(filteredOrders).length > archivePreview.length && (
                <p className="text-xs text-slate-400 text-center pt-2 border-t border-slate-200 mt-2">
                  ... 还有 {generateRenameList(filteredOrders).length - archivePreview.length} 个文件
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={handleExportRenameExcel}
              disabled={filteredOrders.length === 0}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                filteredOrders.length === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700',
              )}
            >
              <FileText className="w-4 h-4" />
              导出改名清单（Excel）
            </button>
            <button
              onClick={handleExportRenameBat}
              disabled={filteredOrders.length === 0}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                filteredOrders.length === 0
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
