# Trading Analytics Platform MVP

## Core Features to Implement:
1. **Dashboard Overview** - Main analytics dashboard with key metrics
2. **Account Connection** - Mock connection interface for cTrader/MT4/MT5
3. **Trade Journal** - Add, edit, and view trade entries
4. **Performance Analytics** - Charts and metrics for trading performance
5. **Portfolio Analysis** - Risk management and portfolio insights

## Files to Create:
1. `src/pages/Index.tsx` - Main dashboard with overview metrics
2. `src/pages/AccountConnection.tsx` - Trading account connection interface
3. `src/pages/TradeJournal.tsx` - Trade journaling interface
4. `src/pages/Analytics.tsx` - Detailed performance analytics
5. `src/components/Sidebar.tsx` - Navigation sidebar
6. `src/components/MetricsCard.tsx` - Reusable metrics display component
7. `src/components/TradeChart.tsx` - Trading performance charts
8. `src/lib/mockData.ts` - Mock trading data for demonstration

## Implementation Strategy:
- Use localStorage for data persistence (mock backend)
- Implement responsive design with Tailwind CSS
- Use Recharts for data visualization
- Create intuitive navigation between sections
- Focus on clean, professional trading interface design