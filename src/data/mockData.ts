import type { AfterSaleOrder, CategoryRule, UrgencyRule, Message } from '@/types';
import { generateId } from '@/utils/textUtils';

export const mockCategoryRules: CategoryRule[] = [
  {
    id: 'rule-1',
    name: '退款申请',
    type: 'refund',
    keywords: ['退款', '退货', '退钱', '不要了', '申请退款', '退款申请', '七天无理由', '质量问题', '发错货', '破损'],
    priority: 100,
    color: '#EF4444',
    enabled: true,
    defaultSuggestion: '请核实退款原因，核对商品状态，按退款流程处理',
  },
  {
    id: 'rule-2',
    name: '补发申请',
    type: 'reissue',
    keywords: ['补发', '重新发货', '少发', '漏发', '缺件', '少件', '没收到', '重新寄', '再发一个'],
    priority: 90,
    color: '#F59E0B',
    enabled: true,
    defaultSuggestion: '请核实发货清单，确认漏发商品，安排补发并告知快递单号',
  },
  {
    id: 'rule-3',
    name: '争议申诉',
    type: 'dispute',
    keywords: ['投诉', '申诉', '差评', '维权', '平台介入', '虚假宣传', '欺骗', '骗人', '赔偿', '投诉到'],
    priority: 80,
    color: '#8B5CF6',
    enabled: true,
    defaultSuggestion: '请优先处理争议订单，主动联系客户协商解决方案，避免平台介入',
  },
  {
    id: 'rule-4',
    name: '咨询沟通',
    type: 'consult',
    keywords: ['请问', '咨询', '怎么', '如何', '什么时候', '多久', '物流', '快递', '到哪了', '发货时间'],
    priority: 70,
    color: '#0EA5E9',
    enabled: true,
    defaultSuggestion: '请及时回复客户咨询，提供准确的物流信息或产品说明',
  },
  {
    id: 'rule-5',
    name: '地址修改',
    type: 'other',
    keywords: ['改地址', '换地址', '地址改', '地址错', '地址不对', '修改地址', '换个地址'],
    priority: 60,
    color: '#10B981',
    enabled: true,
    defaultSuggestion: '请确认订单是否已发货，未发货及时修改地址，已发货联系快递改派',
  },
];

export const mockUrgencyRules: UrgencyRule[] = [
  {
    id: 'urgent-1',
    name: '加急处理',
    keywords: ['紧急', '加急', '尽快', '马上', '立刻', '着急', '催', '特急'],
    enabled: true,
  },
];

function generateMockMessages(type: string, count: number): Message[] {
  const messageTemplates: Record<string, string[]> = {
    refund: [
      '我要退款，这个商品质量有问题',
      '收到货了，但是和描述不一样，申请退款',
      '商品有破损，要求退货退款',
      '不想要了，七天无理由退货',
      '发错货了，我要的是蓝色，发来的是红色',
    ],
    reissue: [
      '收到货了，但是少了一件',
      '快递显示签收了，但我没收到',
      '打开包装发现配件不全',
      '漏发了一个，麻烦补发一下',
      '商品有瑕疵，能不能重新发一个？',
    ],
    dispute: [
      '这是虚假宣传！我要投诉',
      '和描述完全不符，我要维权',
      '再不处理我就差评了',
      '申请平台介入处理',
      '欺骗消费者，我要投诉到12315',
    ],
    consult: [
      '请问什么时候发货？',
      '我的快递到哪了？',
      '这个商品有货吗？',
      '能发顺丰吗？',
      '保质期是多久？',
    ],
    other: [
      '地址写错了，帮我改一下',
      '能不能帮我备注一下？',
      '改一下收货地址，谢谢',
      '地址：北京市朝阳区xxx街道xxx号，电话13800138000',
    ],
  };

  const templates = messageTemplates[type] || messageTemplates.other;
  const messages: Message[] = [];

  for (let i = 0; i < count; i++) {
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    const date = new Date();
    date.setHours(date.getHours() - Math.floor(Math.random() * 48));
    messages.push({
      id: generateId(),
      content: randomTemplate,
      time: date.toISOString(),
      source: i % 3 === 0 ? 'seller' : 'buyer',
    });
  }

  return messages.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

const buyerNames = [
  '小明同学', '爱吃鱼的猫', '阳光下的影子', '快乐小天使', '追梦人',
  '星辰大海', '风中追风', '淡然一笑', '心静自然凉', '岁月静好',
  '萌萌哒', '小猪佩奇', '海绵宝宝', '哆啦A梦', '樱桃小丸子',
];

function generateOrderNo(): string {
  const prefix = ['JD', 'TB', 'PDD', 'TM', 'DY'];
  const p = prefix[Math.floor(Math.random() * prefix.length)];
  const num = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
  return p + num;
}

function generatePhone(): string {
  const prefix = ['138', '139', '158', '159', '186', '188', '136', '137'];
  const p = prefix[Math.floor(Math.random() * prefix.length)];
  const num = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return p + num;
}

export function generateMockOrders(count: number = 50): AfterSaleOrder[] {
  const types: AfterSaleOrder['type'][] = ['refund', 'reissue', 'dispute', 'consult', 'other'];
  const statuses: AfterSaleOrder['status'][] = ['pending', 'processing', 'reviewing', 'completed', 'exception'];
  const reviewers = ['张小明', '李小红', '王大伟', '赵小丽'];

  const orders: AfterSaleOrder[] = [];
  const usedOrderNos: string[] = [];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const messageCount = Math.floor(Math.random() * 4) + 1;
    const messages = generateMockMessages(type, messageCount);

    let orderNo = generateOrderNo();
    let isDuplicate = false;

    if (Math.random() < 0.15 && usedOrderNos.length > 0) {
      orderNo = usedOrderNos[Math.floor(Math.random() * usedOrderNos.length)];
      isDuplicate = true;
    } else {
      usedOrderNos.push(orderNo);
    }

    const statusIndex = Math.floor(Math.random() * statuses.length);
    const status = statuses[statusIndex];
    const isUrgent = Math.random() < 0.2;

    const addressChanged = type === 'other' && Math.random() < 0.6;
    const addresses = [
      '北京市朝阳区建国路88号SOHO现代城A座1201',
      '上海市浦东新区陆家嘴环路1000号恒生银行大厦',
      '广州市天河区天河路385号太古汇',
      '深圳市南山区科技园南区深南大道9996号',
      '杭州市西湖区文三路478号华星时代广场',
    ];

    const order: AfterSaleOrder = {
      id: generateId(),
      orderNo,
      buyerName: buyerNames[Math.floor(Math.random() * buyerNames.length)],
      buyerPhone: generatePhone(),
      type,
      status,
      isUrgent,
      isDuplicate,
      messages,
      originalAddress: addresses[Math.floor(Math.random() * addresses.length)],
      newAddress: addressChanged ? addresses[Math.floor(Math.random() * addresses.length)] : undefined,
      addressChanged,
      suggestion: mockCategoryRules.find((r) => r.type === type)?.defaultSuggestion || '请人工核实后处理',
      reviewer: status !== 'pending' ? reviewers[Math.floor(Math.random() * reviewers.length)] : undefined,
      remark: status === 'completed' ? '已处理完成，客户满意' : undefined,
      attachments: Math.random() < 0.3 ? ['证明图片1.jpg', '快递单照片.jpg'] : [],
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orders.push(order);
  }

  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
