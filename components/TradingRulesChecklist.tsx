import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TradingRule } from '@/lib/mockData';
import { Plus, AlertTriangle, CheckCircle2, LineChart, Trash2 } from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';

interface TradingRulesChecklistProps {
  rules: TradingRule[];
  onAddRule: (rule: string) => void;
  onUpdateCompliance: (ruleId: string, followed: boolean) => void;
  onDeleteRule?: (ruleId: string) => void;
}

export default function TradingRulesChecklist({ 
  rules, 
  onAddRule,
  onUpdateCompliance,
  onDeleteRule
}: TradingRulesChecklistProps) {
  const [newRule, setNewRule] = useState('');
  const [showTrends, setShowTrends] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<TradingRule | null>(null);

  const overallCompliance = rules.length > 0
    ? rules.reduce((sum, rule) => sum + rule.complianceRate, 0) / rules.length
    : 0;

  const mostViolatedRules = [...rules]
    .sort((a, b) => a.complianceRate - b.complianceRate)
    .slice(0, 3);

  const handleAddRule = () => {
    if (newRule.trim()) {
      onAddRule(newRule.trim());
      setNewRule('');
    }
  };

  const handleDeleteClick = (rule: TradingRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (ruleToDelete && onDeleteRule) {
      onDeleteRule(ruleToDelete.id);
      toast.success('Trading rule deleted successfully');
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  // Mock trend data
  const trendData = [
    { week: 'Week 1', compliance: 75 },
    { week: 'Week 2', compliance: 78 },
    { week: 'Week 3', compliance: 82 },
    { week: 'Week 4', compliance: overallCompliance }
  ];

  const getComplianceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overall Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Compliance Score</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTrends(!showTrends)}
            >
              <LineChart className="h-4 w-4 mr-2" />
              {showTrends ? 'Hide' : 'Show'} Trends
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className={`text-5xl font-bold ${getComplianceColor(overallCompliance)}`}>
                {overallCompliance.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-500 mt-2">Average Compliance Rate</p>
            </div>
          </div>
          <Progress value={overallCompliance} className="h-3" />

          {showTrends && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-4">Compliance Trend</h4>
              <ResponsiveContainer width="100%" height={200}>
                <ReLineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="compliance" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Compliance %"
                  />
                </ReLineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Most Violated Rules */}
      {mostViolatedRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Most Violated Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostViolatedRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rule.rule}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Violated {rule.violated} out of {rule.totalChecks} times
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {rule.complianceRate.toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Rules Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.map((rule) => (
            <div 
              key={rule.id} 
              className="group border rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    id={rule.id}
                    checked={rule.complianceRate === 100}
                    disabled
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={rule.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {rule.rule}
                      {rule.isCustom && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Custom
                        </Badge>
                      )}
                    </label>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        {rule.followed} followed
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                        {rule.violated} violated
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${
                      rule.complianceRate >= 80 ? 'border-green-600 text-green-600' :
                      rule.complianceRate >= 60 ? 'border-yellow-600 text-yellow-600' :
                      'border-red-600 text-red-600'
                    }`}
                  >
                    {rule.complianceRate.toFixed(0)}%
                  </Badge>
                  {onDeleteRule && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteClick(rule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <Progress value={rule.complianceRate} className="h-2 mt-2" />
            </div>
          ))}

          {/* Add Custom Rule */}
          <div className="flex gap-2 pt-4 border-t">
            <Input
              placeholder="Add custom trading rule..."
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddRule();
                }
              }}
            />
            <Button onClick={handleAddRule} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trading Rule</AlertDialogTitle>
            <AlertDialogDescription>
              {ruleToDelete?.isCustom ? (
                <>
                  Are you sure you want to delete this custom rule? This action cannot be undone.
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-medium text-gray-900">{ruleToDelete?.rule}</p>
                  </div>
                </>
              ) : (
                <>
                  Are you sure you want to remove this rule from tracking? You can add it back later.
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-medium text-gray-900">{ruleToDelete?.rule}</p>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}