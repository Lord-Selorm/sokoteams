import { useState } from 'react';
import { Plus, Sparkles, Trash2, Play, Pause, ChevronDown } from 'lucide-react';
import type { AutomationRule } from '@/types';
import { cn } from '@/lib/utils';

interface AutomationRulesProps {
  rules: AutomationRule[];
  onAddRule: (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateRule: (id: string, rule: Partial<AutomationRule>) => void;
  onDeleteRule: (id: string) => void;
}

export default function AutomationRules({
  rules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}: AutomationRulesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger: { type: 'status-change' as const, conditions: {} },
    actions: [],
  });

  const triggerTypes = [
    { value: 'status-change', label: 'Status Change' },
    { value: 'due-date', label: 'Due Date' },
    { value: 'assignment', label: 'Assignment' },
    { value: 'comment', label: 'Comment' },
  ] as const;

  const actionTypes = [
    { value: 'update-status', label: 'Update Status' },
    { value: 'send-notification', label: 'Send Notification' },
    { value: 'assign-user', label: 'Assign User' },
    { value: 'add-tag', label: 'Add Tag' },
  ] as const;

  const handleAdd = () => {
    if (newRule.name.trim()) {
      onAddRule({
        ...newRule,
        enabled: true,
      });
      setNewRule({
        name: '',
        trigger: { type: 'status-change', conditions: {} },
        actions: [],
      });
      setIsAdding(false);
    }
  };

  const getTriggerIcon = (type: AutomationRule['trigger']['type']) => {
    switch (type) {
      case 'status-change': return <Sparkles className="w-4 h-4" />;
      case 'due-date': return <Sparkles className="w-4 h-4" />;
      case 'assignment': return <Sparkles className="w-4 h-4" />;
      case 'comment': return <Sparkles className="w-4 h-4" />;
    }
  };

  const getTriggerColor = (type: AutomationRule['trigger']['type']) => {
    switch (type) {
      case 'status-change': return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20';
      case 'due-date': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
      case 'assignment': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
      case 'comment': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Automation Rules</h3>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
        >
          <Plus className="w-3 h-3" />
          Add Rule
        </button>
      </div>

      {isAdding && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Rule Name</label>
            <input
              type="text"
              value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              placeholder="e.g., Auto-mark overdue tasks"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Trigger</label>
            <select
              value={newRule.trigger.type}
              onChange={(e) => setNewRule({ ...newRule, trigger: { type: e.target.value as any, conditions: {} } })}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {triggerTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Actions</label>
            <div className="space-y-2">
              {actionTypes.map((action) => (
                <label key={action.value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  {action.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              Create Rule
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewRule({
                  name: '',
                  trigger: { type: 'status-change', conditions: {} },
                  actions: [],
                });
              }}
              className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rules.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No automation rules yet
          </p>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                'bg-white dark:bg-gray-800 border rounded-lg p-4 transition-colors',
                rule.enabled ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 opacity-60'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', getTriggerColor(rule.trigger.type))}>
                    {getTriggerIcon(rule.trigger.type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">
                      {rule.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {triggerTypes.find(t => t.value === rule.trigger.type)?.label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateRule(rule.id, { enabled: !rule.enabled })}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      rule.enabled
                        ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    )}
                  >
                    {rule.enabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Actions:</span>
                  <div className="flex flex-wrap gap-1">
                    {rule.actions.map((action, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {actionTypes.find(a => a.value === action.type)?.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Example rules */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Popular Automations</h4>
        <div className="space-y-2">
          {[
            { name: 'Auto-assign overdue tasks', trigger: 'due-date', action: 'assign-user' },
            { name: 'Notify on task completion', trigger: 'status-change', action: 'send-notification' },
            { name: 'Add "urgent" tag to high priority', trigger: 'status-change', action: 'add-tag' },
          ].map((example) => (
            <button
              key={example.name}
              onClick={() => {
                setNewRule({
                  name: example.name,
                  trigger: { type: example.trigger as any, conditions: {} },
                  actions: [{ type: example.action as any, parameters: {} }],
                });
                setIsAdding(true);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
