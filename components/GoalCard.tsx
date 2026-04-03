import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Goal } from '@/lib/mockData';
import { Calendar, Target, TrendingUp, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
}

export default function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const profitProgress = (goal.currentProfit / goal.targetProfit) * 100;
  const winRateProgress = (goal.currentWinRate / goal.targetWinRate) * 100;
  const tradesProgress = (goal.currentTrades / goal.targetTrades) * 100;
  
  const overallProgress = (profitProgress + winRateProgress + tradesProgress) / 3;
  
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'text-green-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = () => {
    switch (goal.status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'completed':
        return <Badge className="bg-green-600">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const daysRemaining = Math.ceil(
    (new Date(goal.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{goal.description}</CardTitle>
            {getStatusBadge()}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(goal)}
              disabled={goal.status !== 'active'}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(goal.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(goal.startDate), 'MMM dd')} - {format(new Date(goal.endDate), 'MMM dd, yyyy')}
            </span>
          </div>
          {goal.status === 'active' && (
            <Badge variant="outline" className="text-xs">
              {daysRemaining} days left
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className={`text-sm font-bold ${getProgressColor(overallProgress)}`}>
              {overallProgress.toFixed(1)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Profit Target */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Profit Target</span>
            </div>
            <span className={`text-sm font-bold ${getProgressColor(profitProgress)}`}>
              {profitProgress.toFixed(1)}%
            </span>
          </div>
          <Progress value={profitProgress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatCurrency(goal.currentProfit)} / {formatCurrency(goal.targetProfit)}</span>
            <span>{formatCurrency(goal.targetProfit - goal.currentProfit)} to go</span>
          </div>
        </div>

        {/* Win Rate Target */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Win Rate Target</span>
            </div>
            <span className={`text-sm font-bold ${getProgressColor(winRateProgress)}`}>
              {winRateProgress.toFixed(1)}%
            </span>
          </div>
          <Progress value={winRateProgress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{goal.currentWinRate.toFixed(1)}% / {goal.targetWinRate}%</span>
            <span>{(goal.targetWinRate - goal.currentWinRate).toFixed(1)}% gap</span>
          </div>
        </div>

        {/* Trades Target */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Trades Target</span>
            </div>
            <span className={`text-sm font-bold ${getProgressColor(tradesProgress)}`}>
              {tradesProgress.toFixed(1)}%
            </span>
          </div>
          <Progress value={tradesProgress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{goal.currentTrades} / {goal.targetTrades} trades</span>
            <span>{goal.targetTrades - goal.currentTrades} to go</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}