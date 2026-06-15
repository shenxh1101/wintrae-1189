import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Plus, Trash2, Edit2, Save, X, GripVertical, ToggleLeft, ToggleRight, Tag, AlertCircle, MessageSquarePlus } from 'lucide-react';
import { AFTER_SALE_TYPE_LABELS, AFTER_SALE_TYPE_COLORS, type AfterSaleType, type CategoryRule } from '@/types';
import { cn } from '@/lib/utils';

type TabType = 'category' | 'urgency' | 'suggestion';

export function RulesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('category');
  const { categoryRules, urgencyRules, updateCategoryRule, deleteCategoryRule, addCategoryRule, toggleCategoryRule } = useAppStore();
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newRule, setNewRule] = useState<Partial<CategoryRule>>({
    name: '',
    type: 'other',
    keywords: [],
    priority: 50,
    color: '#6B7280',
    enabled: true,
    defaultSuggestion: '',
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [editKeywordInput, setEditKeywordInput] = useState('');

  const tabs = [
    { id: 'category', label: '分类规则', icon: Tag },
    { id: 'urgency', label: '紧急件规则', icon: AlertCircle },
    { id: 'suggestion', label: '处理建议模板', icon: MessageSquarePlus },
  ];

  const handleAddKeyword = () => {
    if (keywordInput.trim() && newRule.keywords && !newRule.keywords.includes(keywordInput.trim())) {
      setNewRule({ ...newRule, keywords: [...newRule.keywords, keywordInput.trim()] });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setNewRule({ ...newRule, keywords: newRule.keywords?.filter((k) => k !== keyword) });
  };

  const handleAddEditKeyword = () => {
    if (editKeywordInput.trim() && editingRule && !editingRule.keywords.includes(editKeywordInput.trim())) {
      setEditingRule({ ...editingRule, keywords: [...editingRule.keywords, editKeywordInput.trim()] });
      setEditKeywordInput('');
    }
  };

  const handleRemoveEditKeyword = (keyword: string) => {
    if (editingRule) {
      setEditingRule({ ...editingRule, keywords: editingRule.keywords.filter((k) => k !== keyword) });
    }
  };

  const handleSaveNew = () => {
    if (newRule.name && newRule.keywords?.length) {
      addCategoryRule(newRule as Omit<CategoryRule, 'id'>);
      setIsAdding(false);
      setNewRule({
        name: '',
        type: 'other',
        keywords: [],
        priority: 50,
        color: '#6B7280',
        enabled: true,
        defaultSuggestion: '',
      });
    }
  };

  const handleSaveEdit = () => {
    if (editingRule) {
      updateCategoryRule(editingRule.id, editingRule);
      setEditingRule(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">规则配置</h1>
          <p className="text-slate-500 text-sm mt-1">管理售后分类规则与处理模板</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex border-b border-slate-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'category' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">按优先级排序，优先级高的规则先匹配</p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  添加规则
                </button>
              </div>

              {isAdding && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-slate-800">新建分类规则</h4>
                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">规则名称</label>
                      <input
                        type="text"
                        value={newRule.name}
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="如：质量问题退款"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">售后类型</label>
                      <select
                        value={newRule.type}
                        onChange={(e) => setNewRule({ ...newRule, type: e.target.value as AfterSaleType })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        {Object.entries(AFTER_SALE_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">优先级</label>
                      <input
                        type="number"
                        value={newRule.priority}
                        onChange={(e) => setNewRule({ ...newRule, priority: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">标签颜色</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={newRule.color}
                          onChange={(e) => setNewRule({ ...newRule, color: e.target.value })}
                          className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                        />
                        <span className="text-sm text-slate-500">{newRule.color}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">关键词</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="输入关键词后按回车添加"
                      />
                      <button
                        onClick={handleAddKeyword}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                      >
                        添加
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newRule.keywords?.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs"
                        >
                          {kw}
                          <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-teal-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">默认处理建议</label>
                    <textarea
                      value={newRule.defaultSuggestion}
                      onChange={(e) => setNewRule({ ...newRule, defaultSuggestion: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                      placeholder="匹配到该规则时的默认处理建议"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsAdding(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveNew}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" />
                      保存
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {[...categoryRules].sort((a, b) => b.priority - a.priority).map((rule) => (
                  <div key={rule.id}>
                    {editingRule?.id === rule.id ? (
                      <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-slate-800">编辑规则</h4>
                          <button onClick={() => setEditingRule(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">规则名称</label>
                            <input
                              type="text"
                              value={editingRule.name}
                              onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">售后类型</label>
                            <select
                              value={editingRule.type}
                              onChange={(e) => setEditingRule({ ...editingRule, type: e.target.value as AfterSaleType })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            >
                              {Object.entries(AFTER_SALE_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">优先级</label>
                            <input
                              type="number"
                              value={editingRule.priority}
                              onChange={(e) => setEditingRule({ ...editingRule, priority: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">标签颜色</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={editingRule.color}
                                onChange={(e) => setEditingRule({ ...editingRule, color: e.target.value })}
                                className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                              />
                              <span className="text-sm text-slate-500">{editingRule.color}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">关键词</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={editKeywordInput}
                              onChange={(e) => setEditKeywordInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEditKeyword())}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="输入关键词后按回车添加"
                            />
                            <button
                              onClick={handleAddEditKeyword}
                              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm"
                            >
                              添加
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {editingRule.keywords.map((kw) => (
                              <span
                                key={kw}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs"
                              >
                                {kw}
                                <button onClick={() => handleRemoveEditKeyword(kw)} className="hover:text-teal-900">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">默认处理建议</label>
                          <textarea
                            value={editingRule.defaultSuggestion}
                            onChange={(e) => setEditingRule({ ...editingRule, defaultSuggestion: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingRule(null)}
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm flex items-center gap-1"
                          >
                            <Save className="w-4 h-4" />
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                        <div className="text-slate-300 cursor-grab">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: rule.color }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{rule.name}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: rule.color + '20', color: rule.color }}
                            >
                              {AFTER_SALE_TYPE_LABELS[rule.type]}
                            </span>
                            <span className="text-xs text-slate-400">优先级: {rule.priority}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {rule.keywords.slice(0, 5).map((kw) => (
                              <span
                                key={kw}
                                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
                              >
                                {kw}
                              </span>
                            ))}
                            {rule.keywords.length > 5 && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                                +{rule.keywords.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleCategoryRule(rule.id)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {rule.enabled ? (
                            <ToggleRight className="w-6 h-6 text-teal-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-300" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCategoryRule(rule.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'urgency' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">配置紧急件的识别关键词，匹配到关键词的订单将被标记为紧急件</p>
              {urgencyRules.map((rule) => (
                <div key={rule.id} className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      <span className="font-medium text-slate-800">{rule.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${rule.enabled ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                      {rule.enabled ? '已启用' : '已停用'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rule.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'suggestion' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">各售后类型的默认处理建议模板，可在分类规则中单独配置</p>
              <div className="space-y-3">
                {Object.entries(AFTER_SALE_TYPE_LABELS).map(([type, label]) => {
                  const rule = categoryRules.find((r) => r.type === type && r.enabled);
                  return (
                    <div key={type} className="p-4 bg-white rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: AFTER_SALE_TYPE_COLORS[type as AfterSaleType] }}
                        />
                        <span className="font-medium text-slate-800">{label}</span>
                      </div>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                        {rule?.defaultSuggestion || '暂无默认处理建议'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
