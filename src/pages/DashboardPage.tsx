import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { AFTER_SALE_TYPE_LABELS, AFTER_SALE_TYPE_COLORS, ORDER_STATUS_LABELS } from '@/types';
import { FileText, AlertTriangle, Repeat, MapPin, Clock, TrendingUp, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DateRangeFilter } from '@/components/common/DateRangeFilter';

export function DashboardPage() {
  const { getStatistics, getDateFilteredOrders } = useAppStore();
  const stats = getStatistics();

  const typeChartData = Object.entries(stats.byType).map(([type, count]) => ({
    name: AFTER_SALE_TYPE_LABELS[type as keyof typeof AFTER_SALE_TYPE_LABELS],
    value: count,
    color: AFTER_SALE_TYPE_COLORS[type as keyof typeof AFTER_SALE_TYPE_COLORS],
  }));

  const statusChartData = Object.entries(stats.byStatus).map(([status, count]) => ({
    name: ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS],
    数量: count,
  }));

  const urgentOrders = getDateFilteredOrders().filter((o) => o.isUrgent).slice(0, 5);

  const statCards = [
    {
      title: '总订单数',
      value: stats.total,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: '紧急件',
      value: stats.urgentCount,
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      title: '重复申诉',
      value: stats.duplicateCount,
      icon: Repeat,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: '地址变更',
      value: stats.addressChangedCount,
      icon: MapPin,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">数据概览</h1>
          <p className="text-slate-500 text-sm mt-1">售后数据统计与分析</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeFilter />
          <Link
            to="/tasks"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Play className="w-4 h-4" />
            新建任务
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">{card.title}</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{card.value}</p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-xl`}>
                <card.icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">售后类型分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {typeChartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-slate-600">{item.name}</span>
                <span className="text-xs font-medium text-slate-800 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">处理状态分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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

      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            紧急工单
          </h3>
          <Link to="/review" className="text-sm text-teal-600 hover:text-teal-700">
            查看全部 →
          </Link>
        </div>
        {urgentOrders.length > 0 ? (
          <div className="space-y-3">
            {urgentOrders.map((order) => (
              <Link
                key={order.id}
                to={`/review?id=${order.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{order.orderNo}</p>
                    <p className="text-xs text-slate-500 truncate max-w-xs">
                      {order.messages[0]?.content}
                    </p>
                  </div>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: AFTER_SALE_TYPE_COLORS[order.type] + '20',
                    color: AFTER_SALE_TYPE_COLORS[order.type],
                  }}
                >
                  {AFTER_SALE_TYPE_LABELS[order.type]}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无紧急工单</p>
          </div>
        )}
      </div>
    </div>
  );
}
