import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb, 
  Target, 
  Shield, 
  BarChart,
  Copy,
  RefreshCw
} from 'lucide-react';
import { Trade } from '@/lib/mockData';
import { toast } from 'sonner';

interface AIAnalysisAgentProps {
  trades: Trade[];
  metrics?: {
    winRate: number;
    profitFactor: number;
    totalPnL: number;
    expectancy?: number;
    maxDrawdown?: number;
    currentStreak?: number;
    avgWin: number;
    avgLoss: number;
  };
  // Analytics-specific data
  analyticsData?: {
    hourlyPerformance?: Array<{hour: string; trades: number; winRate: number; avgProfit: number; totalPnL: number}>;
    sessionPerformance?: Array<{session: string; trades: number; winRate: number; avgProfit: number; totalPnL: number}>;
    symbolPerformance?: Array<{symbol: string; trades: number; winRate: number; pnl: number; wins: number; losses: number}>;
    drawdownData?: {
      maxDrawdown: number;
      maxDrawdownPct: number;
      currentDrawdown: number;
      currentDrawdownPct: number;
    };
    streakData?: {
      currentStreak: number;
      currentStreakType: 'win' | 'loss' | null;
      longestWinStreak: number;
      longestLossStreak: number;
    };
    tpHitRate?: number;
    slHitRate?: number;
    manualCloseRate?: number;
  };
}

interface Analysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  insights: string[];
  recommendations: string[];
  riskWarnings: string[];
}

export default function AIAnalysisAgent({ trades, metrics, analyticsData }: AIAnalysisAgentProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Analyze trades by symbol
  const analyzeBySymbol = useMemo(() => {
    const symbolStats: Record<string, { trades: number; wins: number; losses: number; pnl: number }> = {};
    
    trades.forEach(trade => {
      if (!symbolStats[trade.symbol]) {
        symbolStats[trade.symbol] = { trades: 0, wins: 0, losses: 0, pnl: 0 };
      }
      symbolStats[trade.symbol].trades++;
      if (trade.pnl) {
        symbolStats[trade.symbol].pnl += trade.pnl;
        if (trade.pnl > 0) symbolStats[trade.symbol].wins++;
        else symbolStats[trade.symbol].losses++;
      }
    });

    return Object.entries(symbolStats)
      .map(([symbol, stats]) => ({
        symbol,
        ...stats,
        winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  // Analyze trades by session
  const analyzeBySession = useMemo(() => {
    const sessionStats: Record<string, { trades: number; wins: number; pnl: number }> = {};
    
    trades.forEach(trade => {
      if (trade.session) {
        if (!sessionStats[trade.session]) {
          sessionStats[trade.session] = { trades: 0, wins: 0, pnl: 0 };
        }
        sessionStats[trade.session].trades++;
        if (trade.pnl) {
          sessionStats[trade.session].pnl += trade.pnl;
          if (trade.pnl > 0) sessionStats[trade.session].wins++;
        }
      }
    });

    return Object.entries(sessionStats)
      .map(([session, stats]) => ({
        session,
        ...stats,
        winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [trades]);

  // Generate AI Analysis
  const generateAIAnalysis = (): Analysis => {
    const analysis: Analysis = {
      summary: "",
      strengths: [],
      weaknesses: [],
      insights: [],
      recommendations: [],
      riskWarnings: []
    };

    const closedTrades = trades.filter(t => t.status === 'closed');
    const winRate = metrics?.winRate || 0;
    const profitFactor = metrics?.profitFactor || 0;
    const totalPnL = metrics?.totalPnL || 0;
    const avgWin = metrics?.avgWin || 0;
    const avgLoss = metrics?.avgLoss || 0;
    const maxDrawdown = metrics?.maxDrawdown || 0;
    const currentStreak = metrics?.currentStreak || 0;

    // Performance Summary
    if (analyticsData) {
      analysis.summary = `Advanced analysis across multiple dimensions: ${closedTrades.length} closed trades with ${winRate.toFixed(1)}% win rate and ${profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)} profit factor. `;
    } else {
      analysis.summary = `Based on ${closedTrades.length} closed trades with a ${winRate.toFixed(1)}% win rate and ${profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)} profit factor, `;
    }
    
    if (winRate >= 60 && profitFactor >= 2) {
      analysis.summary += "you're showing excellent trading performance with strong risk management. Your strategy is well-calibrated and consistently profitable.";
    } else if (winRate >= 50 && profitFactor >= 1.5) {
      analysis.summary += "you're showing solid trading performance with good potential. With some refinements, you can achieve even better results.";
    } else if (winRate >= 40 && profitFactor >= 1) {
      analysis.summary += "you're on the right track but there are key areas that need improvement to achieve consistent profitability.";
    } else {
      analysis.summary += "there are significant areas that need immediate attention to improve profitability and protect your capital.";
    }

    if (avgWin > 0 && avgLoss > 0) {
      const rrRatio = avgWin / avgLoss;
      analysis.summary += ` Your average win of ${formatCurrency(avgWin)} ${rrRatio >= 2 ? 'significantly outweighs' : rrRatio >= 1.5 ? 'outweighs' : 'compares to'} your average loss of ${formatCurrency(avgLoss)}.`;
    }

    // Strengths Analysis
    if (winRate >= 60) {
      analysis.strengths.push(`🎯 Excellent win rate of ${winRate.toFixed(1)}% (industry average is 50-55%) - your trade selection is highly effective`);
    } else if (winRate >= 50) {
      analysis.strengths.push(`✅ Solid win rate of ${winRate.toFixed(1)}% shows consistent trade selection`);
    }

    if (profitFactor >= 2) {
      analysis.strengths.push(`💰 Strong profit factor of ${profitFactor.toFixed(2)} indicates you're winning significantly more than losing`);
    } else if (profitFactor >= 1.5) {
      analysis.strengths.push(`📈 Good profit factor of ${profitFactor.toFixed(2)} shows positive edge in the market`);
    }

    if (avgWin > 0 && avgLoss > 0 && avgWin / avgLoss >= 2) {
      analysis.strengths.push(`🎖️ Excellent risk-reward ratio with average wins ${(avgWin / avgLoss).toFixed(2)}x larger than losses`);
    }

    if (totalPnL > 0) {
      analysis.strengths.push(`💵 Positive total P&L of ${formatCurrency(totalPnL)} demonstrates overall profitability`);
    }

    // Analytics-specific strengths
    if (analyticsData?.tpHitRate !== undefined && analyticsData.tpHitRate > 40) {
      analysis.strengths.push(`🎯 High TP hit rate of ${analyticsData.tpHitRate.toFixed(1)}% shows excellent target placement and patience`);
    }

    if (analyticsData?.streakData) {
      const streak = analyticsData.streakData;
      if (streak.longestWinStreak >= 5) {
        analysis.strengths.push(`🔥 Impressive longest winning streak of ${streak.longestWinStreak} trades demonstrates consistency`);
      }
    }

    if (analyzeBySymbol.length > 0 && analyzeBySymbol[0].pnl > 0) {
      analysis.strengths.push(`🏆 ${analyzeBySymbol[0].symbol} is your strongest pair with ${formatCurrency(analyzeBySymbol[0].pnl)} total P&L`);
    }

    if (analyzeBySession.length > 0 && analyzeBySession[0].winRate >= 60) {
      analysis.strengths.push(`⏰ Best performance during ${analyzeBySession[0].session} (${analyzeBySession[0].winRate.toFixed(1)}% win rate)`);
    }

    // Weaknesses Analysis
    if (winRate < 45) {
      analysis.weaknesses.push(`⚠️ Win rate of ${winRate.toFixed(1)}% is below optimal - focus on trade quality over quantity`);
    }

    if (profitFactor < 1) {
      analysis.weaknesses.push(`🚨 Profit factor below 1.0 means you're losing more money than you're making - immediate strategy review needed`);
    } else if (profitFactor < 1.5) {
      analysis.weaknesses.push(`📉 Profit factor of ${profitFactor.toFixed(2)} needs improvement - aim for 1.5 or higher`);
    }

    // Analytics-specific weaknesses
    if (analyticsData?.drawdownData) {
      const dd = analyticsData.drawdownData;
      if (dd.maxDrawdownPct > 20) {
        analysis.weaknesses.push(`💥 High maximum drawdown of ${dd.maxDrawdownPct.toFixed(1)}% indicates excessive risk exposure - reduce position sizes`);
      } else if (dd.maxDrawdownPct > 15) {
        analysis.weaknesses.push(`⚡ Maximum drawdown of ${dd.maxDrawdownPct.toFixed(1)}% is concerning - implement stricter risk controls`);
      }
    } else if (maxDrawdown > 20) {
      analysis.weaknesses.push(`💥 High maximum drawdown of ${maxDrawdown.toFixed(1)}% indicates excessive risk exposure - reduce position sizes`);
    } else if (maxDrawdown > 15) {
      analysis.weaknesses.push(`⚡ Maximum drawdown of ${maxDrawdown.toFixed(1)}% is concerning - implement stricter risk controls`);
    }

    if (avgWin > 0 && avgLoss > 0 && avgWin / avgLoss < 1.5) {
      analysis.weaknesses.push(`📊 Risk-reward ratio of ${(avgWin / avgLoss).toFixed(2)}:1 is suboptimal - target at least 2:1 on trades`);
    }

    // Analytics-specific: TP/SL analysis
    if (analyticsData?.tpHitRate !== undefined && analyticsData.tpHitRate < 20) {
      analysis.weaknesses.push(`🎯 Low TP hit rate of ${analyticsData.tpHitRate.toFixed(1)}% - your targets may be too ambitious`);
    }

    if (analyticsData?.slHitRate !== undefined && analyticsData.slHitRate > 50) {
      analysis.weaknesses.push(`🛑 High SL hit rate of ${analyticsData.slHitRate.toFixed(1)}% indicates poor entry timing or stops too tight`);
    }

    // Analytics-specific: Hourly performance
    if (analyticsData?.hourlyPerformance) {
      const sortedByPnL = [...analyticsData.hourlyPerformance].sort((a, b) => b.totalPnL - a.totalPnL);
      const worstHours = sortedByPnL.slice(-3).filter(h => h.totalPnL < 0 && h.trades >= 2);
      
      if (worstHours.length > 0) {
        analysis.weaknesses.push(`⏰ Avoid trading during ${worstHours.map(h => h.hour).join(', ')} - consistent losses during these hours`);
      }
    }

    // Analytics-specific: Session performance
    if (analyticsData?.sessionPerformance && analyticsData.sessionPerformance.length > 1) {
      const sorted = [...analyticsData.sessionPerformance].sort((a, b) => b.totalPnL - a.totalPnL);
      const worst = sorted[sorted.length - 1];
      
      if (worst?.totalPnL < 0) {
        analysis.weaknesses.push(`📉 ${worst.session} shows poor performance (${formatCurrency(worst.totalPnL)}, ${worst.winRate.toFixed(1)}% win rate)`);
      }
    }

    const worstSymbol = analyzeBySymbol.find(s => s.pnl < 0);
    if (worstSymbol) {
      analysis.weaknesses.push(`❌ ${worstSymbol.symbol} showing consistent losses (${formatCurrency(worstSymbol.pnl)}) - consider avoiding this pair`);
    }

    // Pattern Insights
    if (analyzeBySymbol.length > 0) {
      const bestSymbol = analyzeBySymbol[0];
      if (bestSymbol.pnl > 0) {
        analysis.insights.push(`💎 ${bestSymbol.symbol} is your most profitable pair with ${formatCurrency(bestSymbol.pnl)} total P&L and ${bestSymbol.winRate.toFixed(1)}% win rate`);
      }
    }

    // Analytics-specific: Hourly insights
    if (analyticsData?.hourlyPerformance) {
      const sortedByPnL = [...analyticsData.hourlyPerformance].sort((a, b) => b.totalPnL - a.totalPnL);
      const bestHours = sortedByPnL.slice(0, 3).filter(h => h.totalPnL > 0 && h.trades >= 2);
      
      if (bestHours.length > 0) {
        const hoursList = bestHours.map(h => h.hour).join(', ');
        const bestHour = bestHours[0];
        analysis.insights.push(`⏰ Your most profitable trading hours are ${hoursList} with ${bestHour.hour} being strongest (${bestHour.winRate.toFixed(1)}% win rate)`);
      }
    }

    // Analytics-specific: Session insights
    if (analyticsData?.sessionPerformance && analyticsData.sessionPerformance.length > 0) {
      const sorted = [...analyticsData.sessionPerformance].sort((a, b) => b.totalPnL - a.totalPnL);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      
      if (best?.totalPnL > 0) {
        analysis.insights.push(`🌟 ${best.session} is your strongest with ${formatCurrency(best.totalPnL)} P&L and ${best.winRate.toFixed(1)}% win rate - focus your trading here`);
      }
      
      if (worst && sorted.length > 1 && worst.winRate < 40) {
        analysis.insights.push(`⏳ ${worst.session} is your weakest period (${worst.winRate.toFixed(1)}% win rate) - avoid or reduce trading during this time`);
      }
    } else if (analyzeBySession.length > 0) {
      const bestSession = analyzeBySession[0];
      const worstSession = analyzeBySession[analyzeBySession.length - 1];
      
      if (bestSession.winRate >= 60) {
        analysis.insights.push(`🌟 You perform ${((bestSession.winRate / 50) * 100 - 100).toFixed(0)}% better during ${bestSession.session} - focus your trading here`);
      }
      
      if (worstSession.winRate < 40 && analyzeBySession.length > 1) {
        analysis.insights.push(`⏳ ${worstSession.session} is your weakest period (${worstSession.winRate.toFixed(1)}% win rate) - avoid or reduce trading during this time`);
      }
    }

    const tpHitTrades = closedTrades.filter(t => t.exitType === 'tp');
    const slHitTrades = closedTrades.filter(t => t.exitType === 'sl');
    const tpRate = analyticsData?.tpHitRate ?? (closedTrades.length > 0 ? (tpHitTrades.length / closedTrades.length) * 100 : 0);
    const slRate = analyticsData?.slHitRate ?? (closedTrades.length > 0 ? (slHitTrades.length / closedTrades.length) * 100 : 0);

    if (tpRate >= 50) {
      analysis.insights.push(`🎯 ${tpRate.toFixed(1)}% of your trades hit take profit - excellent target placement`);
    } else if (slRate > tpRate) {
      analysis.insights.push(`⚠️ More trades hitting stop loss (${slRate.toFixed(1)}%) than take profit (${tpRate.toFixed(1)}%) - review your entry timing`);
    }

    // Analytics-specific: Streak insights
    if (analyticsData?.streakData) {
      const streak = analyticsData.streakData;
      
      if (streak.currentStreakType === 'win' && streak.currentStreak >= 5) {
        analysis.insights.push(`🔥 You're on a ${streak.currentStreak}-trade winning streak - stay disciplined and don't overtrade`);
      } else if (streak.currentStreakType === 'loss' && streak.currentStreak >= 3) {
        analysis.insights.push(`❄️ Currently on a ${streak.currentStreak}-trade losing streak - this is normal, stick to your plan`);
      }
    } else {
      if (currentStreak > 3) {
        analysis.insights.push(`🔥 You're on a ${currentStreak}-trade winning streak - stay disciplined and don't overtrade`);
      } else if (currentStreak < -2) {
        analysis.insights.push(`❄️ Currently on a ${Math.abs(currentStreak)}-trade losing streak - this is normal, stick to your plan`);
      }
    }

    // Recommendations
    if (winRate < 50) {
      analysis.recommendations.push("📋 Review your entry criteria - focus on high-probability setups with clear confirmation");
      analysis.recommendations.push("📉 Consider reducing position sizes until win rate improves above 50%");
      analysis.recommendations.push("📚 Study your winning trades to identify common patterns and replicate them");
    }

    if (profitFactor < 1.5) {
      analysis.recommendations.push("🎯 Improve risk-reward ratio by targeting 2:1 or better on all trades");
      analysis.recommendations.push("✂️ Cut losses quickly at your stop loss - don't let losses run");
      analysis.recommendations.push("🚀 Let winners run longer - trail your stop loss to capture bigger moves");
    }

    // Analytics-specific recommendations
    if (analyticsData?.hourlyPerformance) {
      const sortedByPnL = [...analyticsData.hourlyPerformance].sort((a, b) => b.totalPnL - a.totalPnL);
      const bestHours = sortedByPnL.slice(0, 3).filter(h => h.totalPnL > 0 && h.trades >= 2);
      
      if (bestHours.length > 0) {
        const bestHour = bestHours[0];
        analysis.recommendations.push(`⏰ Focus trading during ${bestHour.hour} when you perform best (${bestHour.winRate.toFixed(1)}% win rate, ${formatCurrency(bestHour.avgProfit)} avg profit)`);
      }
    }

    if (analyticsData?.sessionPerformance && analyticsData.sessionPerformance.length > 0) {
      const sorted = [...analyticsData.sessionPerformance].sort((a, b) => b.totalPnL - a.totalPnL);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      
      if (best?.totalPnL > 0) {
        analysis.recommendations.push(`🌟 Prioritize ${best.session} where you have proven edge (${best.winRate.toFixed(1)}% win rate)`);
      }
      
      if (worst && sorted.length > 1 && worst.totalPnL < 0) {
        analysis.recommendations.push(`🚫 Avoid ${worst.session} until performance improves - currently showing ${formatCurrency(worst.totalPnL)} loss`);
      }
    } else if (analyzeBySession.length > 0 && analyzeBySession[0].winRate >= 60) {
      analysis.recommendations.push(`⏰ Concentrate your trading during ${analyzeBySession[0].session} when you perform best`);
    }

    if (analyticsData?.tpHitRate !== undefined && analyticsData.tpHitRate < 20) {
      analysis.recommendations.push("🎯 Reduce TP targets to 1.5:1 or 2:1 risk-reward - your current targets may be too ambitious");
    }

    if (analyticsData?.drawdownData) {
      const dd = analyticsData.drawdownData;
      if (dd.currentDrawdownPct > 10) {
        analysis.recommendations.push(`📉 Currently in ${dd.currentDrawdownPct.toFixed(1)}% drawdown - consider taking a break until equity recovers`);
      }
      if (dd.maxDrawdownPct > 15) {
        analysis.recommendations.push("💰 Reduce position sizes by 50% to protect capital and lower drawdown risk");
      }
    }

    if (analyticsData?.streakData) {
      const streak = analyticsData.streakData;
      if (streak.currentStreakType === 'loss' && streak.currentStreak >= 3) {
        analysis.recommendations.push("🛑 You're on a losing streak - take a 24-48 hour break to reset mentally");
        analysis.recommendations.push("🔍 Review recent trades to identify if you're deviating from your strategy");
        analysis.recommendations.push("📝 Reduce position size by 50% until you regain confidence");
      }
    } else if (currentStreak < -2) {
      analysis.recommendations.push("🛑 You're on a losing streak - consider taking a break to reset mentally");
      analysis.recommendations.push("🔍 Review recent trades to identify if you're deviating from your strategy");
      analysis.recommendations.push("📝 Reduce position size by 50% until you regain confidence");
    }

    analysis.recommendations.push("🛡️ Set a daily loss limit (e.g., 2-3% of account) to protect your capital");
    analysis.recommendations.push("📖 Keep a detailed trading journal to track patterns, emotions, and lessons learned");
    
    if (analyzeBySymbol.length > 0 && analyzeBySymbol[0].pnl > 0) {
      analysis.recommendations.push(`💪 Focus on ${analyzeBySymbol[0].symbol} where you have proven edge - specialize before diversifying`);
    }

    analysis.recommendations.push("📊 Review your trades weekly to identify what's working and what needs adjustment");
    analysis.recommendations.push("🎓 Continue education - study price action, market structure, and risk management");

    // Risk Warnings
    if (analyticsData?.drawdownData) {
      const dd = analyticsData.drawdownData;
      if (dd.maxDrawdownPct > 20) {
        analysis.riskWarnings.push(`🚨 Maximum drawdown of ${dd.maxDrawdownPct.toFixed(1)}% is dangerously high - implement stricter risk controls immediately`);
        analysis.riskWarnings.push("⚠️ Consider reducing position size to 0.5% risk per trade until drawdown improves");
      } else if (dd.maxDrawdownPct > 15) {
        analysis.riskWarnings.push(`🚨 Maximum drawdown of ${dd.maxDrawdownPct.toFixed(1)}% is concerning - implement stricter risk controls immediately`);
        analysis.riskWarnings.push("⚠️ Consider reducing position size to 0.5% risk per trade until drawdown improves");
      }
      
      if (dd.currentDrawdownPct > 10) {
        analysis.riskWarnings.push(`⚠️ Currently in ${dd.currentDrawdownPct.toFixed(1)}% drawdown - focus on capital preservation`);
      }
    } else if (maxDrawdown > 15) {
      analysis.riskWarnings.push(`🚨 Maximum drawdown of ${maxDrawdown.toFixed(1)}% is concerning - implement stricter risk controls immediately`);
      analysis.riskWarnings.push("⚠️ Consider reducing position size to 0.5% risk per trade until drawdown improves");
    }

    if (analyticsData?.streakData) {
      const streak = analyticsData.streakData;
      if (streak.currentStreakType === 'loss' && streak.currentStreak >= 3) {
        analysis.riskWarnings.push(`🛑 Current losing streak of ${streak.currentStreak} trades - STOP trading and reassess your strategy`);
        analysis.riskWarnings.push("🧘 Take at least 24-48 hours break to clear your mind and avoid revenge trading");
      }
    } else if (currentStreak <= -3) {
      analysis.riskWarnings.push(`🛑 Current losing streak of ${Math.abs(currentStreak)} trades - STOP trading and reassess your strategy`);
      analysis.riskWarnings.push("🧘 Take at least 24-48 hours break to clear your mind and avoid revenge trading");
    }

    if (totalPnL < 0) {
      analysis.riskWarnings.push("💔 Overall account is in drawdown - focus on capital preservation over profit");
      analysis.riskWarnings.push("📉 Reduce risk per trade to 0.5% or less until you return to profitability");
    }

    if (profitFactor < 1) {
      analysis.riskWarnings.push("🚨 CRITICAL: Profit factor below 1.0 - your current strategy is not profitable");
      analysis.riskWarnings.push("🔄 Consider paper trading or demo account until you develop a consistently profitable approach");
    }

    if (winRate < 35) {
      analysis.riskWarnings.push(`⚠️ Win rate of ${winRate.toFixed(1)}% is very low - your entry timing or strategy needs major revision`);
    }

    return analysis;
  };

  const handleOpenAnalysis = () => {
    setShowAnalysis(true);
    setIsAnalyzing(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const newAnalysis = generateAIAnalysis();
      setAnalysis(newAnalysis);
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleRegenerateAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const newAnalysis = generateAIAnalysis();
      setAnalysis(newAnalysis);
      setIsAnalyzing(false);
      toast.success('Analysis regenerated successfully');
    }, 1500);
  };

  const handleCopyAnalysis = () => {
    if (!analysis) return;

    const text = `
AI TRADING ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}

PERFORMANCE SUMMARY
${analysis.summary}

STRENGTHS (${analysis.strengths.length})
${analysis.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

WEAKNESSES (${analysis.weaknesses.length})
${analysis.weaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n')}

KEY INSIGHTS (${analysis.insights.length})
${analysis.insights.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}

RECOMMENDATIONS (${analysis.recommendations.length})
${analysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${analysis.riskWarnings.length > 0 ? `RISK WARNINGS (${analysis.riskWarnings.length})\n${analysis.riskWarnings.map((rw, i) => `${i + 1}. ${rw}`).join('\n')}` : ''}
    `.trim();

    navigator.clipboard.writeText(text);
    toast.success('Analysis copied to clipboard');
  };

  if (trades.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating AI Button */}
      <Button
        onClick={handleOpenAnalysis}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg hover:shadow-xl transition-all animate-pulse z-50"
        title="Get AI Trading Insights"
      >
        <Bot className="h-6 w-6" />
      </Button>

      {/* Analysis Dialog */}
      <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-purple-600" />
              {analyticsData ? 'Advanced AI Trading Analysis' : 'AI Trading Insights'}
            </DialogTitle>
            <DialogDescription>
              {analyticsData 
                ? 'Deep analysis across time periods, sessions, and performance patterns'
                : 'Comprehensive analysis of your trading performance with actionable insights'
              }
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-120px)] pr-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Bot className="h-16 w-16 text-blue-600 animate-bounce" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">Analyzing Your Trading Data...</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Processing {trades.length} trades and generating insights
                  </p>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateAnalysis}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAnalysis}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Analysis
                  </Button>
                </div>

                {/* Performance Summary */}
                <Alert className="border-blue-200 bg-blue-50">
                  <BarChart className="h-5 w-5 text-blue-600" />
                  <AlertDescription className="text-blue-900 font-medium">
                    {analysis.summary}
                  </AlertDescription>
                </Alert>

                {/* Tabs for Different Sections */}
                <Tabs defaultValue="strengths" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                    <TabsTrigger value="strengths">Strengths</TabsTrigger>
                    <TabsTrigger value="weaknesses">Weaknesses</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                    <TabsTrigger value="recommendations">Tips</TabsTrigger>
                    <TabsTrigger value="warnings">Warnings</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </TabsList>

                  {/* Strengths Tab */}
                  <TabsContent value="strengths" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                          <TrendingUp className="h-5 w-5" />
                          Your Strengths ({analysis.strengths.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysis.strengths.length > 0 ? (
                          <ul className="space-y-3">
                            {analysis.strengths.map((item, index) => (
                              <li key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <span className="text-green-600 font-bold text-lg">✓</span>
                                <span className="text-gray-800">{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-center py-4">Keep trading to build your strengths!</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Weaknesses Tab */}
                  <TabsContent value="weaknesses" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                          <TrendingDown className="h-5 w-5" />
                          Areas to Improve ({analysis.weaknesses.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysis.weaknesses.length > 0 ? (
                          <ul className="space-y-3">
                            {analysis.weaknesses.map((item, index) => (
                              <li key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <span className="text-orange-600 font-bold text-lg">!</span>
                                <span className="text-gray-800">{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-center py-4">Great job! No major weaknesses identified.</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Insights Tab */}
                  <TabsContent value="insights" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                          <Lightbulb className="h-5 w-5" />
                          Key Insights ({analysis.insights.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysis.insights.length > 0 ? (
                          <ul className="space-y-3">
                            {analysis.insights.map((item, index) => (
                              <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <span className="text-blue-600 font-bold text-lg">💡</span>
                                <span className="text-gray-800">{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-center py-4">More data needed to generate insights.</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Recommendations Tab */}
                  <TabsContent value="recommendations" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                          <Target className="h-5 w-5" />
                          Actionable Recommendations ({analysis.recommendations.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {analysis.recommendations.map((item, index) => (
                            <li key={index} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <Badge className="bg-purple-600 text-white mt-0.5">{index + 1}</Badge>
                              <span className="text-gray-800">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Warnings Tab */}
                  <TabsContent value="warnings" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                          <Shield className="h-5 w-5" />
                          Risk Warnings ({analysis.riskWarnings.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analysis.riskWarnings.length > 0 ? (
                          <ul className="space-y-3">
                            {analysis.riskWarnings.map((item, index) => (
                              <li key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-800 font-medium">{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-center py-4">No critical warnings at this time. Keep up the good work!</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* All Tab */}
                  <TabsContent value="all" className="space-y-6">
                    {/* Strengths */}
                    {analysis.strengths.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-green-700">
                            <TrendingUp className="h-5 w-5" />
                            Your Strengths
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {analysis.strengths.map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-green-600">✓</span>
                                <span className="text-sm">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Weaknesses */}
                    {analysis.weaknesses.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-orange-700">
                            <TrendingDown className="h-5 w-5" />
                            Areas to Improve
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {analysis.weaknesses.map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-orange-600">!</span>
                                <span className="text-sm">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Insights */}
                    {analysis.insights.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-blue-700">
                            <Lightbulb className="h-5 w-5" />
                            Key Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {analysis.insights.map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-600">💡</span>
                                <span className="text-sm">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendations */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                          <Target className="h-5 w-5" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {analysis.recommendations.map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Badge className="bg-purple-600 text-white text-xs">{index + 1}</Badge>
                              <span className="text-sm">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Risk Warnings */}
                    {analysis.riskWarnings.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-red-700">
                            <Shield className="h-5 w-5" />
                            Risk Warnings
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {analysis.riskWarnings.map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm font-medium">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}