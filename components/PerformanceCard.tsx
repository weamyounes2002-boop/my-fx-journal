import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';

interface PerformanceCardProps {
  title: string;
  pnl: number;
  trades: number;
  winRate: number;
  period: 'today' | 'week' | 'month';
}

export default function PerformanceCard({ title, pnl, trades, winRate, period }: PerformanceCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const getPeriodIcon = () => {
    switch (period) {
      case 'today':
        return <Calendar className="h-4 w-4 text-gray-400" />;
      case 'week':
        return <Activity className="h-4 w-4 text-gray-400" />;
      case 'month':
        return <TrendingUp className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {getPeriodIcon()}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {pnl >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <span className={`text-2xl font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(pnl)}
              </span>
            </div>
            <p className="text-xs text-gray-500">P&L</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <div>
              <p className="text-lg font-semibold">{trades}</p>
              <p className="text-xs text-gray-500">Trades</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{winRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Win Rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}