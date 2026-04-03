import { useState, useMemo } from 'react';
import { Trade } from '@/lib/mockData';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TradingCalendarProps {
  trades: Trade[];
  onDateClick: (date: Date) => void;
}

export default function TradingCalendar({ trades, onDateClick }: TradingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  // Calculate daily P&L
  const dailyPnL = useMemo(() => {
    const pnlMap: Record<string, number> = {};
    
    trades.forEach(trade => {
      if (trade.status === 'closed' && trade.pnl) {
        const tradeDate = new Date(trade.exitDate || trade.entryDate);
        const dateKey = `${tradeDate.getFullYear()}-${tradeDate.getMonth()}-${tradeDate.getDate()}`;
        pnlMap[dateKey] = (pnlMap[dateKey] || 0) + trade.pnl;
      }
    });
    
    return pnlMap;
  }, [trades]);

  const getDayPnL = (day: number) => {
    const dateKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${day}`;
    return dailyPnL[dateKey] || 0;
  };

  const getDayColor = (day: number) => {
    const pnl = getDayPnL(day);
    if (pnl > 0) return 'bg-green-100 text-green-800 hover:bg-green-200';
    if (pnl < 0) return 'bg-red-100 text-red-800 hover:bg-red-200';
    return 'bg-gray-50 text-gray-400 hover:bg-gray-100';
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onDateClick(date);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">{monthName}</h3>
        <Button variant="outline" size="sm" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}

        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}

        {/* Calendar days */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const pnl = getDayPnL(day);
          const hasData = pnl !== 0;

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`aspect-square rounded-lg border transition-all ${getDayColor(day)} ${
                hasData ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex flex-col items-center justify-center h-full p-1">
                <span className="text-sm font-semibold">{day}</span>
                {hasData && (
                  <span className="text-xs font-semibold mt-1">
                    {formatCurrency(pnl)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded" />
          <span className="text-gray-600">Profit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
          <span className="text-gray-600">Loss</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded" />
          <span className="text-gray-600">No Trades</span>
        </div>
      </div>
    </div>
  );
}