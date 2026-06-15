import * as XLSX from 'xlsx';
import { type AfterSaleOrder, type Message, type ColumnMapping, type CategoryRule, AFTER_SALE_TYPE_LABELS } from '@/types';
import { generateId, extractOrderNo, extractPhone, extractAddressChange, matchKeywords } from './textUtils';

export async function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export function detectColumns(data: any[]): ColumnMapping {
  if (data.length === 0) return {};

  const firstRow = data[0];
  const keys = Object.keys(firstRow);
  const mapping: ColumnMapping = {};

  const orderNoPatterns = ['订单号', '订单编号', 'order id', 'order_no', 'orderid'];
  const buyerNamePatterns = ['买家昵称', '买家姓名', '用户名', 'buyer', '昵称'];
  const buyerPhonePatterns = ['手机号', '电话', '联系方式', 'phone', 'mobile'];
  const contentPatterns = ['留言内容', '内容', '留言', '备注', 'message', 'content'];
  const timePatterns = ['留言时间', '时间', '创建时间', 'time', 'date', 'create'];
  const addressPatterns = ['地址', '收货地址', 'address'];

  for (const key of keys) {
    const lowerKey = key.toLowerCase();

    if (!mapping.orderNo && orderNoPatterns.some((p) => lowerKey.includes(p.toLowerCase()))) {
      mapping.orderNo = key;
    }
    if (!mapping.buyerName && buyerNamePatterns.some((p) => lowerKey.includes(p.toLowerCase()))) {
      mapping.buyerName = key;
    }
    if (!mapping.buyerPhone && buyerPhonePatterns.some((p) => lowerKey.includes(p.toLowerCase()))) {
      mapping.buyerPhone = key;
    }
    if (!mapping.content && contentPatterns.some((p) => lowerKey.includes(p.toLowerCase()))) {
      mapping.content = key;
    }
    if (!mapping.messageTime && timePatterns.some((p) => lowerKey.includes(p.toLowerCase()))) {
      mapping.messageTime = key;
    }
    if (!mapping.address && addressPatterns.some((p) => lowerKey.includes(p.toLowerCase()))) {
      mapping.address = key;
    }
  }

  return mapping;
}

export function processRawData(
  rawData: any[],
  mapping: ColumnMapping,
  categoryRules: CategoryRule[],
): AfterSaleOrder[] {
  const orders: AfterSaleOrder[] = [];
  const orderCountMap = new Map<string, number>();
  const sortedRules = [...categoryRules].filter((r) => r.enabled).sort((a, b) => b.priority - a.priority);

  for (const row of rawData) {
    const rawOrderNo = mapping.orderNo ? row[mapping.orderNo]?.toString() : '';
    const content = mapping.content ? row[mapping.content]?.toString() : '';
    const buyerName = mapping.buyerName ? row[mapping.buyerName]?.toString() : '';
    const buyerPhone = mapping.buyerPhone ? row[mapping.buyerPhone]?.toString() : '';
    const messageTime = mapping.messageTime ? row[mapping.messageTime]?.toString() : new Date().toISOString();
    const address = mapping.address ? row[mapping.address]?.toString() : '';

    const orderNo = rawOrderNo || extractOrderNo(content) || generateId();
    const phone = buyerPhone || extractPhone(content) || '';

    const currentCount = orderCountMap.get(orderNo) || 0;
    orderCountMap.set(orderNo, currentCount + 1);

    const message: Message = {
      id: generateId(),
      content,
      time: messageTime,
      source: 'buyer',
    };

    const fullContent = content + ' ' + address;
    const { type, suggestion } = classifyOrder(fullContent, sortedRules);
    const { hasChange, originalAddress: origAddr, newAddress: newAddr } = extractAddressChange(fullContent);

    const order: AfterSaleOrder = {
      id: generateId(),
      orderNo,
      buyerName: buyerName || '未知用户',
      buyerPhone: phone,
      type,
      status: 'pending',
      isUrgent: false,
      isDuplicate: false,
      duplicateCount: currentCount + 1,
      messages: [message],
      originalAddress: origAddr || address || undefined,
      newAddress: hasChange ? newAddr : undefined,
      addressChanged: hasChange,
      suggestion,
      attachments: [],
      createdAt: messageTime && messageTime.length > 4 ? new Date(messageTime).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orders.push(order);
  }

  markUrgentOrders(orders, sortedRules);

  for (const order of orders) {
    const count = orderCountMap.get(order.orderNo) || 0;
    order.isDuplicate = count > 1;
    order.duplicateTotal = count;
  }

  return orders;
}

function classifyOrder(
  content: string,
  sortedRules: CategoryRule[],
): { type: AfterSaleOrder['type']; suggestion: string } {
  for (const rule of sortedRules) {
    if (matchKeywords(content, rule.keywords)) {
      return { type: rule.type, suggestion: rule.defaultSuggestion };
    }
  }
  return { type: 'other', suggestion: '请人工核实后处理' };
}

function markUrgentOrders(orders: AfterSaleOrder[], rules: CategoryRule[]): void {
  const urgentKeywords = ['紧急', '加急', '尽快', '马上', '立刻', '着急', '催', '尽快处理', '特急'];

  for (const order of orders) {
    const fullContent = order.messages.map((m) => m.content).join(' ');
    const isUrgent = urgentKeywords.some((kw) => fullContent.includes(kw));
    order.isUrgent = isUrgent;
  }
}

function markDuplicateOrders(orders: AfterSaleOrder[]): void {
  const orderCountMap = new Map<string, number>();

  for (const order of orders) {
    const count = orderCountMap.get(order.orderNo) || 0;
    orderCountMap.set(order.orderNo, count + 1);
  }

  for (const order of orders) {
    if ((orderCountMap.get(order.orderNo) || 0) > 1) {
      order.isDuplicate = true;
    }
  }
}

export function exportToExcel(orders: AfterSaleOrder[], filename: string): void {
  const exportData = orders.map((order) => ({
    订单号: order.orderNo,
    买家昵称: order.buyerName,
    联系电话: order.buyerPhone,
    售后类型: getTypeLabel(order.type),
    是否紧急: order.isUrgent ? '是' : '否',
    是否重复申诉: order.isDuplicate ? '是' : '否',
    地址变更: order.addressChanged ? '是' : '否',
    新地址: order.newAddress || '',
    留言内容: order.messages.map((m) => m.content).join('\n'),
    处理建议: order.suggestion,
    复核人: order.reviewer || '',
    人工备注: order.remark || '',
    状态: getStatusLabel(order.status),
    创建时间: order.createdAt,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '售后数据');

  const colWidths = [
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 30 },
    { wch: 50 },
    { wch: 30 },
    { wch: 10 },
    { wch: 30 },
    { wch: 10 },
    { wch: 20 },
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    refund: '退款申请',
    reissue: '补发申请',
    dispute: '争议申诉',
    consult: '咨询沟通',
    other: '其他类型',
  };
  return labels[type] || type;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    reviewing: '复核中',
    completed: '已完成',
    exception: '异常件',
  };
  return labels[status] || status;
}

export function generateArchiveFileName(order: AfterSaleOrder, index: number): string {
  const dateStr = new Date(order.createdAt).toISOString().slice(0, 10).replace(/-/g, '');
  const typeShort = {
    refund: '退款',
    reissue: '补发',
    dispute: '争议',
    consult: '咨询',
    other: '其他',
  }[order.type];
  return `${order.orderNo}_${typeShort}_${dateStr}_${String(index).padStart(3, '0')}`;
}

export interface RenameItem {
  originalName: string;
  newName: string;
  orderNo: string;
  type: string;
  buyerName: string;
}

export function generateRenameList(orders: AfterSaleOrder[]): RenameItem[] {
  const items: RenameItem[] = [];
  const typeLabels: Record<string, string> = {
    refund: '退款',
    reissue: '补发',
    dispute: '争议',
    consult: '咨询',
    other: '其他',
  };

  const ordersWithAttachments = orders.filter((o) => o.attachments.length > 0);

  ordersWithAttachments.forEach((order) => {
    order.attachments.forEach((att, attIndex) => {
      const globalIndex = items.length + 1;
      const ext = att.includes('.') ? att.slice(att.lastIndexOf('.')) : '';
      const newBaseName = generateArchiveFileName(order, globalIndex);
      items.push({
        originalName: att,
        newName: newBaseName + ext,
        orderNo: order.orderNo,
        type: typeLabels[order.type] || order.type,
        buyerName: order.buyerName,
      });
    });
  });

  return items;
}

export function exportRenameList(orders: AfterSaleOrder[], filename: string): void {
  const renameItems = generateRenameList(orders);

  const exportData = renameItems.map((item, idx) => ({
    序号: idx + 1,
    订单号: item.orderNo,
    买家: item.buyerName,
    售后类型: item.type,
    原文件名: item.originalName,
    新文件名: item.newName,
    重命名命令: `ren "${item.originalName}" "${item.newName}"`,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '附件改名清单');

  const colWidths = [
    { wch: 6 },
    { wch: 20 },
    { wch: 15 },
    { wch: 10 },
    { wch: 30 },
    { wch: 40 },
    { wch: 60 },
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportRenameBat(orders: AfterSaleOrder[], filename: string): void {
  const renameItems = generateRenameList(orders);
  const lines = [
    '@echo off',
    'chcp 65001',
    'echo 正在批量重命名附件...',
    'echo.',
    '',
  ];

  renameItems.forEach((item, idx) => {
    lines.push(`echo [${idx + 1}] ${item.originalName}  --^>  ${item.newName}`);
    lines.push(`ren "${item.originalName}" "${item.newName}"`);
  });

  lines.push('');
  lines.push('echo.');
  lines.push('echo 重命名完成！');
  lines.push('pause');

  const content = lines.join('\r\n');
  const blob = new Blob([content], { type: 'application/bat;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.bat`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface DailyReportRow {
  date: string;
  total: number;
  refund: number;
  reissue: number;
  dispute: number;
  consult: number;
  other: number;
  urgent: number;
  duplicate: number;
  addressChanged: number;
  completed: number;
  pending: number;
}

export function generateDailyReport(orders: AfterSaleOrder[]): DailyReportRow[] {
  const dayMap = new Map<string, DailyReportRow>();

  for (const order of orders) {
    const dateStr = new Date(order.createdAt).toISOString().slice(0, 10);
    const existing = dayMap.get(dateStr);
    if (existing) {
      existing.total++;
      existing[order.type]++;
      if (order.isUrgent) existing.urgent++;
      if (order.isDuplicate) existing.duplicate++;
      if (order.addressChanged) existing.addressChanged++;
      if (order.status === 'completed') existing.completed++;
      if (order.status === 'pending') existing.pending++;
    } else {
      const row: DailyReportRow = {
        date: dateStr,
        total: 1,
        refund: order.type === 'refund' ? 1 : 0,
        reissue: order.type === 'reissue' ? 1 : 0,
        dispute: order.type === 'dispute' ? 1 : 0,
        consult: order.type === 'consult' ? 1 : 0,
        other: order.type === 'other' ? 1 : 0,
        urgent: order.isUrgent ? 1 : 0,
        duplicate: order.isDuplicate ? 1 : 0,
        addressChanged: order.addressChanged ? 1 : 0,
        completed: order.status === 'completed' ? 1 : 0,
        pending: order.status === 'pending' ? 1 : 0,
      };
      dayMap.set(dateStr, row);
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function exportDailyReport(orders: AfterSaleOrder[], filename: string): void {
  const report = generateDailyReport(orders);

  const exportData = report.map((row) => ({
    日期: row.date,
    总量: row.total,
    退款申请: row.refund,
    补发申请: row.reissue,
    争议申诉: row.dispute,
    咨询沟通: row.consult,
    其他: row.other,
    紧急件: row.urgent,
    重复申诉: row.duplicate,
    地址变更: row.addressChanged,
    已完成: row.completed,
    待处理: row.pending,
  }));

  const totals = {
    日期: '合计',
    总量: report.reduce((s, r) => s + r.total, 0),
    退款申请: report.reduce((s, r) => s + r.refund, 0),
    补发申请: report.reduce((s, r) => s + r.reissue, 0),
    争议申诉: report.reduce((s, r) => s + r.dispute, 0),
    咨询沟通: report.reduce((s, r) => s + r.consult, 0),
    其他: report.reduce((s, r) => s + r.other, 0),
    紧急件: report.reduce((s, r) => s + r.urgent, 0),
    重复申诉: report.reduce((s, r) => s + r.duplicate, 0),
    地址变更: report.reduce((s, r) => s + r.addressChanged, 0),
    已完成: report.reduce((s, r) => s + r.completed, 0),
    待处理: report.reduce((s, r) => s + r.pending, 0),
  };

  exportData.push(totals);

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '统计日报');

  const colWidths = [
    { wch: 12 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
    { wch: 8 }, { wch: 6 }, { wch: 6 }, { wch: 8 }, { wch: 8 },
    { wch: 6 }, { wch: 6 },
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportHandoverSummary(orders: AfterSaleOrder[], filename: string): void {
  const dateRange = orders.length > 0
    ? `${orders.reduce((min, o) => o.createdAt < min ? o.createdAt : min, orders[0].createdAt).slice(0, 10)} ~ ${orders.reduce((max, o) => o.createdAt > max ? o.createdAt : max, orders[0].createdAt).slice(0, 10)}`
    : '无数据';

  const byType = {
    refund: orders.filter((o) => o.type === 'refund'),
    reissue: orders.filter((o) => o.type === 'reissue'),
    dispute: orders.filter((o) => o.type === 'dispute'),
    consult: orders.filter((o) => o.type === 'consult'),
    other: orders.filter((o) => o.type === 'other'),
  };

  const highRiskOrders = orders.filter((o) => o.isDuplicate || o.isUrgent || o.addressChanged);
  const unprocessed = orders.filter((o) => o.status !== 'completed');

  const reviewerPending: Record<string, number> = {};
  for (const o of unprocessed) {
    const r = o.reviewer || '未分配';
    reviewerPending[r] = (reviewerPending[r] || 0) + 1;
  }

  const wsData: any[] = [];

  wsData.push({ A: '售后交接摘要', B: '', C: '', D: '' });
  wsData.push({ A: '日期范围', B: dateRange, C: '', D: '' });
  wsData.push({ A: '生成时间', B: new Date().toLocaleString('zh-CN'), C: '', D: '' });
  wsData.push({ A: '', B: '', C: '', D: '' });

  wsData.push({ A: '一、总体概况', B: '', C: '', D: '' });
  wsData.push({ A: '总订单数', B: orders.length, C: '已完成', D: orders.filter((o) => o.status === 'completed').length });
  wsData.push({ A: '待处理', B: unprocessed.length, C: '异常优先单', D: highRiskOrders.filter((o) => o.status !== 'completed').length });
  wsData.push({ A: '', B: '', C: '', D: '' });

  wsData.push({ A: '二、分类统计', B: '', C: '', D: '' });
  wsData.push({ A: '退款申请', B: byType.refund.length, C: '已完成', D: byType.refund.filter((o) => o.status === 'completed').length });
  wsData.push({ A: '补发申请', B: byType.reissue.length, C: '已完成', D: byType.reissue.filter((o) => o.status === 'completed').length });
  wsData.push({ A: '争议申诉', B: byType.dispute.length, C: '已完成', D: byType.dispute.filter((o) => o.status === 'completed').length });
  wsData.push({ A: '咨询沟通', B: byType.consult.length, C: '已完成', D: byType.consult.filter((o) => o.status === 'completed').length });
  wsData.push({ A: '其他', B: byType.other.length, C: '已完成', D: byType.other.filter((o) => o.status === 'completed').length });
  wsData.push({ A: '', B: '', C: '', D: '' });

  wsData.push({ A: '三、异常优先单明细', B: '', C: '', D: '' });
  wsData.push({ A: '订单号', B: '买家', C: '类型/标记', D: '状态' });
  const unprocessedHighRisk = highRiskOrders.filter((o) => o.status !== 'completed');
  for (const o of unprocessedHighRisk.slice(0, 50)) {
    const tags: string[] = [getTypeLabel(o.type)];
    if (o.isUrgent) tags.push('紧急');
    if (o.isDuplicate) tags.push('重复');
    if (o.addressChanged) tags.push('地址变更');
    wsData.push({ A: o.orderNo, B: o.buyerName, C: tags.join('/'), D: getStatusLabel(o.status) });
  }
  wsData.push({ A: '', B: '', C: '', D: '' });

  wsData.push({ A: '四、复核人待办', B: '', C: '', D: '' });
  wsData.push({ A: '复核人', B: '待处理数', C: '', D: '' });
  for (const [reviewer, count] of Object.entries(reviewerPending).sort((a, b) => b[1] - a[1])) {
    wsData.push({ A: reviewer, B: count, C: '', D: '' });
  }

  const worksheet = XLSX.utils.json_to_sheet(wsData, { skipHeader: true });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '交接摘要');
  worksheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export interface ArchiveDirItem {
  groupKey: string;
  groupLabel: string;
  files: { originalName: string; newName: string; orderNo: string }[];
}

export function generateArchiveDirPreview(orders: AfterSaleOrder[], groupBy: 'order' | 'date'): ArchiveDirItem[] {
  const ordersWithAttachments = orders.filter((o) => o.attachments.length > 0);
  const renameItems = generateRenameList(orders);
  const groupMap = new Map<string, ArchiveDirItem>();

  for (const order of ordersWithAttachments) {
    const key = groupBy === 'order'
      ? order.orderNo
      : new Date(order.createdAt).toISOString().slice(0, 10);

    const label = groupBy === 'order'
      ? `${order.orderNo} (${AFTER_SALE_TYPE_LABELS[order.type]} / ${order.buyerName})`
      : key;

    const existing = groupMap.get(key);
    const orderRenames = renameItems.filter((r) => r.orderNo === order.orderNo);
    const files = orderRenames.map((r) => ({
      originalName: r.originalName,
      newName: r.newName,
      orderNo: r.orderNo,
    }));

    if (existing) {
      existing.files.push(...files);
    } else {
      groupMap.set(key, { groupKey: key, groupLabel: label, files });
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => b.groupKey.localeCompare(a.groupKey));
}
