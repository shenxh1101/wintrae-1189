import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Download, FileSpreadsheet, FileArchive, BarChart3, Calendar, TrendingUp, Users, PieChart, CheckCircle } from 'lucide-react';
import { AFTER_SALE_TYPE_LABELS, AFTER_SALE_TYPE_COLORS, ORDER_STATUS_LABELS, REVIEWERS, type AfterSaleType } from '@/types';
import { exportToExcel, generateArchiveFileName } from '@/utils/fileUtils';
import { cn } from '@/lib/utils';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function ExportPage() {
  const { orders, getStatistics } = useAppStore();
  const stats = getStatistics();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const typeChartData = Object.entries(stats.byType).map(([type, count]) => ({
    name: AFTER_SALE_TYPE_LABELS[type as keyof typeof AFTER_SALE_TYPE_LABELS],
    value: count,
    color: AFTER_SALE_TYPE_COLORS[type as keyof typeof AFTER_SALE_TYPE_COLORS],
  }));

  const reviewerStats = REVIEWERS.map((reviewer) => ({
    name: reviewer,
    处理数: orders.filter((o) => o.reviewer === reviewer).length,
  })).filter((r) => r.处理数 > 0);

  const handleExportExcel = () => {
    setExporting(true);
    setTimeout(() => {
      const timestamp = new Date().toISOString().slice(0, 10);
      exportToExcel(orders, `售后数据汇总_${timestamp}`);
      setExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    }, 800);
  };

  const handleExportByType = (type: AfterSaleType) => {
    const filteredOrders = orders.filter((o) => o.type === type);
    const timestamp = new Date().toISOString().slice(0, 10);
    exportToExcel(filteredOrders, `${AFTER_SALE_TYPE_LABELS[type]}_${timestamp}`);
  };

  const handleGenerateArchiveNames = () => {
    const archiveNames = orders.slice(0, 10).map((order, idx) => ({
      original: order.attachments[0] || `附件${idx + 1}.jpg`,
      newName: generateArchiveFileName(order, idx + 1) + '.jpg',
    }));
    return archiveNames;
  };

  const archivePreview = handleGenerateArchiveNames();

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
      title: '复核人员',
      value: REVIEWERS.length,
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">导出归档</h1>
          <p className="text-slate-500 text-sm mt-1">统计摘要与批量导出归档</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <span className="text-slate-400">至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
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
              disabled={exporting}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-lg border transition-all',
                exporting
                  ? 'bg-teal-50 border-teal-300'
                  : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-slate-800">导出全部数据</p>
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
              {Object.entries(AFTER_SALE_TYPE_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => handleExportByType(type as AfterSaleType)}
                  className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: AFTER_SALE_TYPE_COLORS[type as AfterSaleType] }}
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                  <span className="text-xs text-slate-400 ml-auto">
                    {stats.byType[type as AfterSaleType]}条
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-teal-600" />
            附件批量改名
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            自动按照「订单号_类型_日期_序号」格式重命名附件
          </p>
          <div className="bg-slate-50 rounded-lg p-3 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              {archivePreview.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 flex-shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-500 truncate line-through">{item.original}</p>
                    <p className="text-teal-700 font-medium truncate">↓ {item.newName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
            onClick={() => {
              setExportSuccess(true);
              setTimeout(() => setExportSuccess(false), 3000);
            }}
          >
            <Download className="w-4 h-4" />
            生成改名清单
          </button>
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
            { label: '是否重复', desc: '重复申诉标记' },
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
