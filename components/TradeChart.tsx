import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartData {
  date: string;
  balance: number;
  pnl: number;
}

interface TradeChartProps {
  data: ChartData[];
  title: string;
}

export default function TradeChart({ data, title }: TradeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value: number, name: string) => [
                name === 'balance' ? `$${value.toLocaleString()}` : `$${value}`,
                name === 'balance' ? 'Balance' : 'P&L'
              ]}
            />
            <Line 
              type="monotone" 
              dataKey="balance" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="pnl" 
              stroke="#16a34a" 
              strokeWidth={2}
              dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}