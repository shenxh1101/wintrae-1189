import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, Play, CheckCircle, XCircle, Clock, ChevronRight, AlertCircle, FileText } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { parseExcelFile, detectColumns, processRawData } from '@/utils/fileUtils';
import type { ColumnMapping } from '@/types';
import { cn } from '@/lib/utils';

export function TasksPage() {
  const { addOrders, categoryRules, tasks, addTask, updateTask } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [showMapping, setShowMapping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setShowMapping(false);

    try {
      const data = await parseExcelFile(file);
      setPreviewData(data.slice(0, 10));
      const mapping = detectColumns(data);
      setColumnMapping(mapping);
      setShowMapping(true);
    } catch (error) {
      console.error('文件解析失败:', error);
      alert('文件解析失败，请检查文件格式');
    }
  };

  const handleColumnMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping((prev) => ({ ...prev, [field]: value || undefined }));
  };

  const startProcessing = async () => {
    if (!selectedFile || previewData.length === 0) return;

    setIsProcessing(true);
    setProcessProgress(0);

    const taskId = addTask({
      fileName: selectedFile.name,
      totalCount: previewData.length,
      processedCount: 0,
      status: 'processing',
    });

    try {
      const steps = [
        { progress: 20, step: '正在识别订单号...' },
        { progress: 40, step: '正在归并用户留言...' },
        { progress: 60, step: '正在按关键词分类...' },
        { progress: 75, step: '正在标记紧急件...' },
        { progress: 85, step: '正在提取地址变更...' },
        { progress: 95, step: '正在识别重复申诉...' },
        { progress: 100, step: '处理完成！' },
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setProcessProgress(steps[i].progress);
        setProcessingStep(steps[i].step);
      }

      const fullData = await parseExcelFile(selectedFile);
      const processedOrders = processRawData(fullData, columnMapping, categoryRules);

      addOrders(processedOrders);

      updateTask(taskId, {
        status: 'completed',
        processedCount: processedOrders.length,
        totalCount: fullData.length,
      });

      setTimeout(() => {
        setIsProcessing(false);
        setSelectedFile(null);
        setPreviewData([]);
        setShowMapping(false);
        setProcessProgress(0);
        setProcessingStep('');
      }, 1000);
    } catch (error) {
      console.error('处理失败:', error);
      updateTask(taskId, {
        status: 'failed',
        errorMessage: '处理失败，请检查数据格式',
      });
      setIsProcessing(false);
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">任务执行</h1>
        <p className="text-slate-500 text-sm mt-1">导入平台导出文件，自动整理售后数据</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-teal-600" />
          导入文件
        </h3>

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

        {isProcessing && (
          <div className="mt-6 p-4 bg-teal-50 rounded-xl border border-teal-200">
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

        {showMapping && !isProcessing && (
          <div className="mt-6 space-y-4">
            <h4 className="font-medium text-slate-700">列名映射</h4>
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
                <h4 className="font-medium text-slate-700 mb-2">数据预览（前 5 条）</h4>
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
                onClick={startProcessing}
                disabled={!columnMapping.orderNo || !columnMapping.content}
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors',
                  columnMapping.orderNo && columnMapping.content
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed',
                )}
              >
                <Play className="w-4 h-4" />
                开始处理
              </button>
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
