import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AfterSaleOrder, CategoryRule, UrgencyRule, ProcessTask, OrderStatus, AfterSaleType } from '@/types';
import { mockCategoryRules, mockUrgencyRules, generateMockOrders } from '@/data/mockData';
import { generateId } from '@/utils/textUtils';

interface AppState {
  orders: AfterSaleOrder[];
  categoryRules: CategoryRule[];
  urgencyRules: UrgencyRule[];
  tasks: ProcessTask[];
  selectedOrderId: string | null;
  filters: {
    type?: AfterSaleType;
    status?: OrderStatus;
    isUrgent?: boolean;
    isDuplicate?: boolean;
    keyword?: string;
    reviewer?: string;
  };
  dateRange: {
    start?: string;
    end?: string;
  };
  currentPage: number;
  pageSize: number;
}

interface AppActions {
  setOrders: (orders: AfterSaleOrder[]) => void;
  addOrders: (orders: AfterSaleOrder[]) => void;
  updateOrder: (id: string, updates: Partial<AfterSaleOrder>) => void;
  deleteOrder: (id: string) => void;
  setSelectedOrderId: (id: string | null) => void;
  setFilters: (filters: Partial<AppState['filters']>) => void;
  resetFilters: () => void;
  setDateRange: (range: Partial<AppState['dateRange']>) => void;
  resetDateRange: () => void;
  setCurrentPage: (page: number) => void;

  getDateFilteredOrders: () => AfterSaleOrder[];

  addCategoryRule: (rule: Omit<CategoryRule, 'id'>) => void;
  updateCategoryRule: (id: string, updates: Partial<CategoryRule>) => void;
  deleteCategoryRule: (id: string) => void;
  toggleCategoryRule: (id: string) => void;

  updateUrgencyRule: (id: string, updates: Partial<UrgencyRule>) => void;

  addTask: (task: Omit<ProcessTask, 'id' | 'createdAt'>) => string;
  updateTask: (id: string, updates: Partial<ProcessTask>) => void;

  getFilteredOrders: () => AfterSaleOrder[];
  getPaginatedOrders: () => AfterSaleOrder[];
  getTotalPages: () => number;

  getStatistics: () => {
    total: number;
    byType: Record<AfterSaleType, number>;
    byStatus: Record<OrderStatus, number>;
    urgentCount: number;
    duplicateCount: number;
    addressChangedCount: number;
  };

  batchUpdateOrders: (ids: string[], updates: Partial<AfterSaleOrder>) => void;
  batchAssignReviewer: (ids: string[], reviewer: string) => void;
}

const initialState: AppState = {
  orders: generateMockOrders(30),
  categoryRules: mockCategoryRules,
  urgencyRules: mockUrgencyRules,
  tasks: [],
  selectedOrderId: null,
  filters: {},
  dateRange: {
    start: undefined,
    end: undefined,
  },
  currentPage: 1,
  pageSize: 20,
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOrders: (orders) => set({ orders }),

      addOrders: (newOrders) =>
        set((state) => ({
          orders: [...newOrders, ...state.orders],
        })),

      updateOrder: (id, updates) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id ? { ...order, ...updates, updatedAt: new Date().toISOString() } : order,
          ),
        })),

      deleteOrder: (id) =>
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== id),
        })),

      setSelectedOrderId: (id) => set({ selectedOrderId: id }),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
          currentPage: 1,
        })),

      resetFilters: () =>
        set({
          filters: {},
          currentPage: 1,
        }),

      setDateRange: (range) =>
        set((state) => ({
          dateRange: { ...state.dateRange, ...range },
          currentPage: 1,
        })),

      resetDateRange: () =>
        set({
          dateRange: { start: undefined, end: undefined },
          currentPage: 1,
        }),

      setCurrentPage: (page) => set({ currentPage: page }),

      getDateFilteredOrders: () => {
        const { orders, dateRange } = get();
        let filtered = [...orders];

        if (dateRange.start) {
          const start = new Date(dateRange.start);
          start.setHours(0, 0, 0, 0);
          filtered = filtered.filter((o) => new Date(o.createdAt) >= start);
        }
        if (dateRange.end) {
          const end = new Date(dateRange.end);
          end.setHours(23, 59, 59, 999);
          filtered = filtered.filter((o) => new Date(o.createdAt) <= end);
        }

        return filtered;
      },

      addCategoryRule: (rule) =>
        set((state) => ({
          categoryRules: [...state.categoryRules, { ...rule, id: generateId() }],
        })),

      updateCategoryRule: (id, updates) =>
        set((state) => ({
          categoryRules: state.categoryRules.map((rule) =>
            rule.id === id ? { ...rule, ...updates } : rule,
          ),
        })),

      deleteCategoryRule: (id) =>
        set((state) => ({
          categoryRules: state.categoryRules.filter((rule) => rule.id !== id),
        })),

      toggleCategoryRule: (id) =>
        set((state) => ({
          categoryRules: state.categoryRules.map((rule) =>
            rule.id === id ? { ...rule, enabled: !rule.enabled } : rule,
          ),
        })),

      updateUrgencyRule: (id, updates) =>
        set((state) => ({
          urgencyRules: state.urgencyRules.map((rule) =>
            rule.id === id ? { ...rule, ...updates } : rule,
          ),
        })),

      addTask: (task) => {
        const newTask = { ...task, id: generateId(), createdAt: new Date().toISOString() };
        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));
        return newTask.id;
      },

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...updates } : task)),
        })),

      getFilteredOrders: () => {
        const { filters, getDateFilteredOrders } = get();
        let filtered = [...getDateFilteredOrders()];

        if (filters.type) {
          filtered = filtered.filter((o) => o.type === filters.type);
        }
        if (filters.status) {
          filtered = filtered.filter((o) => o.status === filters.status);
        }
        if (filters.isUrgent !== undefined) {
          filtered = filtered.filter((o) => o.isUrgent === filters.isUrgent);
        }
        if (filters.isDuplicate !== undefined) {
          filtered = filtered.filter((o) => o.isDuplicate === filters.isDuplicate);
        }
        if (filters.reviewer) {
          filtered = filtered.filter((o) => o.reviewer === filters.reviewer);
        }
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase();
          filtered = filtered.filter(
            (o) =>
              o.orderNo.toLowerCase().includes(kw) ||
              o.buyerName.toLowerCase().includes(kw) ||
              o.messages.some((m) => m.content.toLowerCase().includes(kw)),
          );
        }

        return filtered;
      },

      getPaginatedOrders: () => {
        const { getFilteredOrders, currentPage, pageSize } = get();
        const filtered = getFilteredOrders();
        const start = (currentPage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
      },

      getTotalPages: () => {
        const { getFilteredOrders, pageSize } = get();
        const filtered = getFilteredOrders();
        return Math.ceil(filtered.length / pageSize);
      },

      getStatistics: () => {
        const { getDateFilteredOrders } = get();
        const orders = getDateFilteredOrders();

        const byType: Record<AfterSaleType, number> = {
          refund: 0,
          reissue: 0,
          dispute: 0,
          consult: 0,
          other: 0,
        };

        const byStatus: Record<OrderStatus, number> = {
          pending: 0,
          processing: 0,
          reviewing: 0,
          completed: 0,
          exception: 0,
        };

        let urgentCount = 0;
        let duplicateCount = 0;
        let addressChangedCount = 0;

        for (const order of orders) {
          byType[order.type]++;
          byStatus[order.status]++;
          if (order.isUrgent) urgentCount++;
          if (order.isDuplicate) duplicateCount++;
          if (order.addressChanged) addressChangedCount++;
        }

        return {
          total: orders.length,
          byType,
          byStatus,
          urgentCount,
          duplicateCount,
          addressChangedCount,
        };
      },

      batchUpdateOrders: (ids, updates) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            ids.includes(order.id)
              ? { ...order, ...updates, updatedAt: new Date().toISOString() }
              : order,
          ),
        })),

      batchAssignReviewer: (ids, reviewer) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            ids.includes(order.id)
              ? { ...order, reviewer, status: 'reviewing', updatedAt: new Date().toISOString() }
              : order,
          ),
        })),
    }),
    {
      name: 'after-sale-app-storage',
      partialize: (state) => ({
        orders: state.orders,
        categoryRules: state.categoryRules,
        urgencyRules: state.urgencyRules,
        tasks: state.tasks,
      }),
    },
  ),
);
