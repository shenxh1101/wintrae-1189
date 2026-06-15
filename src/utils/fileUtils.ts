import * as XLSX from 'xlsx';
import type { AfterSaleOrder, Message, ColumnMapping, CategoryRule } from '@/types';
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
  const orderMap = new Map<string, AfterSaleOrder>();
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

    const message: Message = {
      id: generateId(),
      content,
      time: messageTime,
      source: 'buyer',
    };

    if (orderMap.has(orderNo)) {
      const order = orderMap.get(orderNo)!;
      order.messages.push(message);
      order.updatedAt = new Date().toISOString();
    } else {
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
        messages: [message],
        originalAddress: origAddr || address || undefined,
        newAddress: hasChange ? newAddr : undefined,
        addressChanged: hasChange,
        suggestion,
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      orderMap.set(orderNo, order);
    }
  }

  const orders = Array.from(orderMap.values());
  markUrgentOrders(orders, sortedRules);
  markDuplicateOrders(orders);

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
