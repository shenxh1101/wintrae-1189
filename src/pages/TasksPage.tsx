import { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, FileSpreadsheet, Play, CheckCircle, XCircle, Clock, ChevronRight, AlertCircle, FileText, Eye, ArrowRight, Repeat, AlertTriangle, MapPin, Tag, Shield } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { parseExcelFile, detectColumns, processRawData } from '@/utils/fileUtils';
import { AFTER_SALE_TYPE_LABELS, AFTER_SALE_TYPE_COLORS, type ColumnMapping, type AfterSaleOrder } from '@/types';
import { cn, formatDateTime, truncateText } from '@/lib/utils';

type Step = 'upload' | 'mapping' | 'preview' | 'processing';

interface OrderGroup {
  orderNo: string;
  buyerName: string;
  count: number;
  types: string[];
  hasDuplicate: boolean;
  isUrgent: boolean;
  hasAddressChange: boolean;
  orders: AfterSaleOrder[];
}

export function TasksPage() {
  const { addOrders, categoryRules, tasks, addTask, updateTask } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fullData, setFullData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [processedOrders, setProcessedOrders] = useState<AfterSaleOrder[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orderGroups = useMemo<OrderGroup[]>(() => {
    if (processedOrders.length === 0) return [];
    const groupMap = new Map<string, OrderGroup>();
    for (const order of processedOrders) {
      const existing = groupMap.get(order.orderNo);
      if (existing) {
        existing.count++;
        existing.orders.push(order);
        if (!existing.types.includes(order.type)) {
          existing.types.push(order.type);
        }
        existing.hasDuplicate = true;
        if (order.isUrgent) existing.isUrgent = true;
        if (order.addressChanged) existing.hasAddressChange = true;
      } else {
        groupMap.set(order.orderNo, {
          orderNo: order.orderNo,
          buyerName: order.buyerName,
          count: 1,
          types: [order.type],
          hasDuplicate: false,
          isUrgent: order.isUrgent,
          hasAddressChange: order.addressChanged,
          orders: [order],
        });
      }
    }
    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => {
      if (a.hasDuplicate && !b.hasDuplicate) return -1;
      if (!a.hasDuplicate && b.hasDuplicate) return 1;
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return 0;
    });
    return groups;
  }, [processedOrders]);

  const previewStats = useMemo(() => {
    const total = processedOrders.length;
    const duplicateCount = processedOrders.filter((o) => o.isDuplicate).length;
    const urgentCount = processedOrders.filter((o) => o.isUrgent).length;
    const addressChangeCount = processedOrders.filter((o) => o.addressChanged).length;
    const byType: Record<string, number> = {};
    for (const order of processedOrders) {
      const label = AFTER_SALE_TYPE_LABELS[order.type];
      byType[label] = (byType[label] || 0) + 1;
    }
    return { total, duplicateCount, urgentCount, addressChangeCount, byType, groupCount: orderGroups.length };
  }, [processedOrders, orderGroups]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setSelectedFile(file);

    try {
      const data = await parseExcelFile(file);
      setPreviewData(data.slice(0, 10));
      setFullData(data);
      const mapping = detectColumns(data);
      setColumnMapping(mapping);
      setCurrentStep('mapping');
    } catch (error) {
      console.error('文件解析失败:', error);
      alert('文件解析失败，请检查文件格式');
    }
  };

  const handleColumnMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping((prev) => ({ ...prev, [field]: value || undefined }));
  };

  const handleGeneratePreview = () => {
    const orders = processRawData(fullData, columnMapping, categoryRules);
    setProcessedOrders(orders);
    setCurrentStep('preview');
  };

  const handleConfirmImport = async () => {
    if (processedOrders.length === 0) return;

    setCurrentStep('processing');
    setIsProcessing(true);
    setProcessProgress(0);

    const taskId = addTask({
      fileName: selectedFile!.name,
      totalCount: fullData.length,
      processedCount: 0,
      status: 'processing',
    });

    try {
      const steps = [
        { progress: 30, step: '正在写入订单数据...' },
        { progress: 60, step: '正在建立索引...' },
        { progress: 85, step: '正在更新统计...' },
        { progress: 100, step: '入库完成！' },
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setProcessProgress(steps[i].progress);
        setProcessingStep(steps[i].step);
      }

      addOrders(processedOrders);

      updateTask(taskId, {
        status: 'completed',
        processedCount: processedOrders.length,
        totalCount: fullData.length,
      });

      setTimeout(() => {
        setIsProcessing(false);
        resetState();
      }, 800);
    } catch (error) {
      console.error('入库失败:', error);
      updateTask(taskId, {
        status: 'failed',
        errorMessage: '入库失败，请重试',
      });
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setFullData([]);
    setColumnMapping({});
    setProcessedOrders([]);
    setCurrentStep('upload');
    setProcessProgress(0);
    setProcessingStep('');
  };

  const availableColumns = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  const mappingFields = [
    { key: 'orderNo', label: '订单号', required: true },
    { key: 'buyerName', label: '买家昵称', required: false },
    { key: 'buyerPhone', label: '联系电话', required: false },
    { key: 'content', label: '留言内容', required: true },
    { key: 'messageTime', label: '留言时间', required: false },
    { key: 'address', label: '收货地址', required: false },
  ];

  const stepLabels: Record<Step, string> = {
    upload: '上传文件',
    mapping: '列名映射',
    preview: '处理预览',
    processing: '入库处理',
  };

  const stepOrder: Step[] = ['upload', 'mapping', 'preview', 'processing'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">任务执行</h1>
        <p className="text-slate-500 text-sm mt-1">导入平台导出文件，预览处理结果，确认后入库</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          {stepOrder.map((step, idx) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  currentStep === step
                    ? 'bg-teal-600 text-white'
                    : stepOrder.indexOf(currentStep) > stepOrder.indexOf(step)
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-slate-100 text-slate-400',
                )}
              >
                {stepOrder.indexOf(currentStep) > stepOrder.indexOf(step) ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="w-5 h-5 flex items-center justify-center text-xs rounded-full bg-white/20">{idx + 1}</span>
                )}
                {stepLabels[step]}
              </div>
              {idx < stepOrder.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
              )}
            </div>
          ))}
        </div>

        {currentStep === 'upload' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50',
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-teal-600" />
              </div>
              <p className="text-slate-700 font-medium mb-1">
                {selectedFile ? selectedFile.name : '拖拽文件到此处，或点击选择'}
              </p>
              <p className="text-sm text-slate-400">支持 Excel (.xlsx, .xls) 和 CSV 格式</p>
            </div>
          </div>
        )}

        {currentStep === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-700">列名映射</h4>
              <button
                onClick={resetState}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                重新选择文件
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {mappingFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <select
                    value={columnMapping[field.key as keyof ColumnMapping] || ''}
                    onChange={(e) =>
                      handleColumnMappingChange(field.key as keyof ColumnMapping, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">-- 请选择 --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {previewData.length > 0 && (
              <div>
                <h4 className="font-medium text-slate-700 mb-2">数据预览（前 5 条原始数据）</h4>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {availableColumns.slice(0, 6).map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left text-slate-600 font-medium whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          {availableColumns.slice(0, 6).map((col) => (
                            <td key={col} className="px-3 py-2 text-slate-700 truncate max-w-48">
                              {String(row[col] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleGeneratePreview}
                disabled={!columnMapping.orderNo || !columnMapping.content}
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors',
                  columnMapping.orderNo && columnMapping.content
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed',
                )}
              >
                <Eye className="w-4 h-4" />
                生成处理预览
              </button>
            </div>
          </div>
        )}

        {currentStep === 'preview' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-700">处理预览</h4>
              <button
                onClick={() => setCurrentStep('mapping')}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                返回修改映射
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-2xl font-bold text-blue-700">{previewStats.groupCount}</p>
                <p className="text-xs text-blue-600">订单组</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-2xl font-bold text-slate-700">{previewStats.total}</p>
                <p className="text-xs text-slate-500">总记录</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-2xl font-bold text-purple-700">{previewStats.duplicateCount}</p>
                <p className="text-xs text-purple-600">重复申诉</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-2xl font-bold text-amber-700">{previewStats.urgentCount}</p>
                <p className="text-xs text-amber-600">紧急件</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-2xl font-bold text-green-700">{previewStats.addressChangeCount}</p>
                <p className="text-xs text-green-600">地址变更</p>
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-slate-600 mb-2">分类结果分布</h5>
              <div className="flex flex-wrap gap-2">
                {Object.entries(previewStats.byType).map(([label, count]) => {
                  const color = Object.entries(AFTER_SALE_TYPE_LABELS).find(
                    ([, v]) => v === label,
                  );
                  const hex = color
                    ? AFTER_SALE_TYPE_COLORS[color[0] as keyof typeof AFTER_SALE_TYPE_COLORS]
                    : '#6B7280';
                  return (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{ backgroundColor: hex + '15', color: hex }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hex }} />
                      {label}：{count}条
                    </span>
                  );
                })}
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-slate-600 mb-2">
                按订单维度预览
                <span className="text-xs text-slate-400 font-normal ml-2">
                  （重复申诉、紧急件排前）
                </span>
              </h5>
              <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-medium text-slate-600">订单号</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">买家</th>
                      <th className="px-3 py-2 text-center font-medium text-slate-600">记录数</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">分类</th>
                      <th className="px-3 py-2 text-center font-medium text-slate-600">标记</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">留言摘要</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderGroups.map((group) => (
                      <tr
                        key={group.orderNo}
                        className={cn(
                          'border-b border-slate-100 transition-colors',
                          group.hasDuplicate && 'bg-purple-50/50',
                        )}
                        style={group.hasDuplicate ? { boxShadow: 'inset 3px 0 0 0 #7c3aed' } : {}}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-slate-700">{group.orderNo}</span>
                            {group.hasDuplicate && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                                <Repeat className="w-2.5 h-2.5" />
                                {group.count}次
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{group.buyerName}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn(
                            'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                            group.count > 1 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600',
                          )}>
                            {group.count}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {group.types.map((type) => (
                              <span
                                key={type}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                  backgroundColor: AFTER_SALE_TYPE_COLORS[type as keyof typeof AFTER_SALE_TYPE_COLORS] + '20',
                                  color: AFTER_SALE_TYPE_COLORS[type as keyof typeof AFTER_SALE_TYPE_COLORS],
                                }}
                              >
                                {AFTER_SALE_TYPE_LABELS[type as keyof typeof AFTER_SALE_TYPE_LABELS]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            {group.isUrgent && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            {group.hasDuplicate && (
                              <Repeat className="w-3.5 h-3.5 text-purple-500" />
                            )}
                            {group.hasAddressChange && (
                              <MapPin className="w-3.5 h-3.5 text-green-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-500 max-w-xs">
                          {truncateText(group.orders[0].messages[0]?.content || '', 40)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="text-sm text-slate-500">
                <Shield className="w-4 h-4 inline text-teal-500 mr-1" />
                确认分类结果无误后，点击「确认入库」将数据正式写入系统
              </div>
              <button
                onClick={handleConfirmImport}
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors bg-teal-600 text-white hover:bg-teal-700',
                )}
              >
                <CheckCircle className="w-4 h-4" />
                确认入库（{previewStats.total}条）
              </button>
            </div>
          </div>
        )}

        {currentStep === 'processing' && isProcessing && (
          <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-teal-700">{processingStep}</span>
              <span className="text-sm text-teal-600">{processProgress}%</span>
            </div>
            <div className="h-2 bg-teal-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${processProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          历史任务
        </h3>

        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.slice(0, 10).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    task.status === 'completed' && 'bg-green-100',
                    task.status === 'failed' && 'bg-red-100',
                    task.status === 'processing' && 'bg-blue-100',
                    task.status === 'pending' && 'bg-slate-100',
                  )}
                >
                  {task.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {task.status === 'failed' && <XCircle className="w-5 h-5 text-red-600" />}
                  {task.status === 'processing' && <Clock className="w-5 h-5 text-blue-600 animate-spin" />}
                  {task.status === 'pending' && <FileText className="w-5 h-5 text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{task.fileName}</p>
                  <p className="text-xs text-slate-500">
                    共 {task.totalCount} 条记录，处理 {task.processedCount} 条
                  </p>
                </div>
                <span
                  className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    task.status === 'completed' && 'bg-green-100 text-green-700',
                    task.status === 'failed' && 'bg-red-100 text-red-700',
                    task.status === 'processing' && 'bg-blue-100 text-blue-700',
                    task.status === 'pending' && 'bg-slate-100 text-slate-600',
                  )}
                >
                  {task.status === 'completed' && '已完成'}
                  {task.status === 'failed' && '失败'}
                  {task.status === 'processing' && '处理中'}
                  {task.status === 'pending' && '等待中'}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无历史任务</p>
            <p className="text-sm mt-1">导入文件后会自动创建任务记录</p>
          </div>
        )}
      </div>
    </div>
  );
}
