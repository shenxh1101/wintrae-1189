export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

export function extractOrderNo(text: string): string | null {
  const patterns = [
    /\b[0-9A-Z]{10,20}\b/,
    /\b\d{12,}\b/,
    /订单号[：:]\s*([0-9A-Za-z]+)/,
    /order[_\s]?id[：:]\s*([0-9A-Za-z]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  return null;
}

export function extractPhone(text: string): string | null {
  const phonePattern = /1[3-9]\d{9}/;
  const match = text.match(phonePattern);
  return match ? match[0] : null;
}

const PROVINCES = [
  '北京', '天津', '上海', '重庆', '河北', '山西', '辽宁', '吉林', '黑龙江',
  '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南',
  '广东', '广西', '海南', '四川', '贵州', '云南', '西藏', '陕西', '甘肃',
  '青海', '宁夏', '新疆', '内蒙古', '香港', '澳门', '台湾',
];

export function extractAddress(text: string): string | null {
  const addressPatterns = [
    /地址[：:]\s*(.+?)(?:\n|电话|手机|$)/,
    /收货地址[：:]\s*(.+?)(?:\n|电话|手机|$)/,
    /新地址[：:]\s*(.+?)(?:\n|电话|手机|$)/,
    /改地址[为：:]\s*(.+?)(?:\n|电话|手机|$)/,
  ];

  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const addr = match[1].trim();
      if (addr.length > 5) {
        return addr;
      }
    }
  }

  for (const province of PROVINCES) {
    const pattern = new RegExp(`${province}[省市区]?.+?(?:区|县|市|镇|街道).+?(?:路|街|号|室|弄|村)`, 'g');
    const match = text.match(pattern);
    if (match && match[0].length > 10) {
      return match[0];
    }
  }

  return null;
}

export function extractAddressChange(text: string): { hasChange: boolean; originalAddress?: string; newAddress?: string } {
  const changePatterns = [
    /(?:原地址|原来地址|旧地址)[：:]\s*(.+?)\s*(?:改|换|改成|换成|新地址)[为：:]\s*(.+?)(?:\n|电话|手机|$)/,
    /(?:地址|收货地址)(?:改成|换成|改为)[：:]\s*(.+?)(?:\n|电话|手机|$)/,
    /改地址[：:]\s*(.+?)(?:\n|电话|手机|$)/,
  ];

  for (const pattern of changePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        return { hasChange: true, originalAddress: match[1].trim(), newAddress: match[2].trim() };
      } else {
        return { hasChange: true, newAddress: match[1].trim() };
      }
    }
  }

  const hasChangeKeywords = /改地址|换地址|地址变更|修改地址|地址改|换个地址|改收货/;
  if (hasChangeKeywords.test(text)) {
    const newAddr = extractAddress(text);
    if (newAddr) {
      return { hasChange: true, newAddress: newAddr };
    }
  }

  return { hasChange: false };
}

export function matchKeywords(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

export function isDuplicateOrder(orderNos: string[], currentOrderNo: string, timeWindowHours: number = 24): boolean {
  return orderNos.some((no) => no === currentOrderNo);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
