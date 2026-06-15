export type AfterSaleType = 'refund' | 'reissue' | 'dispute' | 'consult' | 'other';

export type OrderStatus = 'pending' | 'processing' | 'reviewing' | 'completed' | 'exception';

export type MessageSource = 'buyer' | 'seller' | 'system';

export interface Message {
  id: string;
  content: string;
  time: string;
  source: MessageSource;
}

export interface AfterSaleOrder {
  id: string;
  orderNo: string;
  buyerName: string;
  buyerPhone: string;
  type: AfterSaleType;
  status: OrderStatus;
  isUrgent: boolean;
  isDuplicate: boolean;
  duplicateOf?: string;
  messages: Message[];
  originalAddress?: string;
  newAddress?: string;
  addressChanged: boolean;
  suggestion: string;
  reviewer?: string;
  remark?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRule {
  id: string;
  name: string;
  type: AfterSaleType;
  keywords: string[];
  priority: number;
  color: string;
  enabled: boolean;
  defaultSuggestion: string;
}

export interface UrgencyRule {
  id: string;
  name: string;
  keywords: string[];
  enabled: boolean;
}

export interface ProcessTask {
  id: string;
  fileName: string;
  totalCount: number;
  processedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  errorMessage?: string;
}

export interface ColumnMapping {
  orderNo?: string;
  buyerName?: string;
  buyerPhone?: string;
  content?: string;
  messageTime?: string;
  address?: string;
}

export interface StatisticsSummary {
  totalOrders: number;
  typeStats: Record<AfterSaleType, number>;
  urgentCount: number;
  duplicateCount: number;
  addressChangedCount: number;
  statusStats: Record<OrderStatus, number>;
  reviewerStats: Record<string, number>;
  dailyTrend: { date: string; count: number }[];
}

export const AFTER_SALE_TYPE_LABELS: Record<AfterSaleType, string> = {
  refund: '退款申请',
  reissue: '补发申请',
  dispute: '争议申诉',
  consult: '咨询沟通',
  other: '其他类型',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  reviewing: '复核中',
  completed: '已完成',
  exception: '异常件',
};

export const AFTER_SALE_TYPE_COLORS: Record<AfterSaleType, string> = {
  refund: '#EF4444',
  reissue: '#F59E0B',
  dispute: '#8B5CF6',
  consult: '#0EA5E9',
  other: '#6B7280',
};

export const REVIEWERS = ['张小明', '李小红', '王大伟', '赵小丽', '陈小强'];
