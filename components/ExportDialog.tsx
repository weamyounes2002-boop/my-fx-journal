import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trade } from '@/lib/mockData';
import { Download, Upload, FileText, Mail, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface ExportDialogProps {
  trades: Trade[];
  onImport?: (trades: Trade[]) => void;
}

interface CSVRow {
  [key: string]: string;
}

export default function ExportDialog({ trades, onImport }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [strategyFilter, setStrategyFilter] = useState('all');
  const [pnlFilter, setPnlFilter] = useState('all');
  const [selectedSections, setSelectedSections] = useState({
    summary: true,
    charts: true,
    statistics: true,
    topTrades: true,
    riskMetrics: true,
    goals: true,
    compliance: true
  });
  const [customNotes, setCustomNotes] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<CSVRow[]>([]);
  const [emailSchedule, setEmailSchedule] = useState({
    frequency: 'weekly',
    email: '',
    reportType: 'summary',
    enabled: false
  });

  const handleCSVExport = () => {
    let filteredTrades = trades;

    // Apply filters
    if (dateRange.from && dateRange.to) {
      filteredTrades = filteredTrades.filter(t => {
        const tradeDate = new Date(t.entryDate);
        return tradeDate >= new Date(dateRange.from) && tradeDate <= new Date(dateRange.to);
      });
    }

    if (strategyFilter !== 'all') {
      filteredTrades = filteredTrades.filter(t => t.tags.includes(strategyFilter));
    }

    if (pnlFilter === 'profit') {
      filteredTrades = filteredTrades.filter(t => t.pnl && t.pnl > 0);
    } else if (pnlFilter === 'loss') {
      filteredTrades = filteredTrades.filter(t => t.pnl && t.pnl < 0);
    }

    // Prepare CSV data
    const csvData = filteredTrades.map(trade => ({
      ID: trade.id,
      Date: trade.entryDate,
      Pair: trade.pair,
      Type: trade.type,
      Entry: trade.entryPrice,
      Exit: trade.exitPrice || '',
      'Stop Loss': trade.stopLoss,
      'Take Profit': trade.takeProfit,
      'Position Size': trade.positionSize,
      'P&L': trade.pnl || '',
      'Exit Type': trade.exitType || '',
      Tags: trade.tags.join('; '),
      Notes: trade.notes.replace(/<[^>]*>/g, '') // Strip HTML
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FX_Journal_Trades_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredTrades.length} trades to CSV`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    Papa.parse<CSVRow>(file, {
      header: true,
      complete: (results) => {
        setImportPreview(results.data.slice(0, 10) as CSVRow[]);
        toast.success('File loaded. Review preview below.');
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const handleImport = () => {
    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }

    Papa.parse<CSVRow>(importFile, {
      header: true,
      complete: (results) => {
        const importedTrades: Trade[] = [];
        let errors = 0;

        results.data.forEach((row: CSVRow, index) => {
          try {
            if (!row.Date || !row.Pair || !row.Type || !row.Entry || !row['Stop Loss'] || !row['Take Profit']) {
              errors++;
              return;
            }

            const trade: Trade = {
              id: `import-${Date.now()}-${index}`,
              symbol: row.Pair,
              pair: row.Pair,
              type: row.Type.toLowerCase() as 'buy' | 'sell',
              entryPrice: parseFloat(row.Entry),
              exitPrice: row.Exit ? parseFloat(row.Exit) : undefined,
              stopLoss: parseFloat(row['Stop Loss']),
              takeProfit: parseFloat(row['Take Profit']),
              positionSize: parseFloat(row['Position Size'] || '0.1'),
              entryDate: row.Date,
              exitDate: row['Exit Date'] || undefined,
              pnl: row['P&L'] ? parseFloat(row['P&L']) : undefined,
              status: row.Exit ? 'closed' : 'open',
              tags: row.Tags ? row.Tags.split(';').map((t: string) => t.trim()) : [],
              exitType: row['Exit Type'] as 'tp' | 'sl' | 'manual' | undefined,
              notes: row.Notes || '',
              volume: parseFloat(row['Position Size'] || '0.1')
            };

            importedTrades.push(trade);
          } catch (error) {
            errors++;
          }
        });

        if (onImport) {
          onImport(importedTrades);
        }

        toast.success(`Imported ${importedTrades.length} trades${errors > 0 ? `, ${errors} errors` : ''}`);
        setImportFile(null);
        setImportPreview([]);
        setIsOpen(false);
      }
    });
  };

  const handlePDFExport = () => {
    toast.info('PDF generation started...');
    
    // Simulate PDF generation
    setTimeout(() => {
      toast.success('PDF report generated successfully');
    }, 2000);
  };

  const handleScheduleEmail = () => {
    if (!emailSchedule.email) {
      toast.error('Please enter an email address');
      return;
    }

    toast.success(`Email reports scheduled ${emailSchedule.frequency} to ${emailSchedule.email}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export / Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export & Import Data</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="csv-export" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="csv-export">CSV Export</TabsTrigger>
            <TabsTrigger value="csv-import">CSV Import</TabsTrigger>
            <TabsTrigger value="pdf-report">PDF Report</TabsTrigger>
            <TabsTrigger value="email-schedule">Email Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="csv-export" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  />
                </div>
                <div>
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Strategy Filter</Label>
                  <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Strategies</SelectItem>
                      <SelectItem value="Scalping">Scalping</SelectItem>
                      <SelectItem value="Swing Trading">Swing Trading</SelectItem>
                      <SelectItem value="Breakout">Breakout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>P&L Filter</Label>
                  <Select value={pnlFilter} onValueChange={setPnlFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trades</SelectItem>
                      <SelectItem value="profit">Profitable Only</SelectItem>
                      <SelectItem value="loss">Losses Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                <Filter className="h-5 w-5 text-blue-600" />
                <span className="text-sm">
                  {trades.length} trades will be exported
                </span>
              </div>

              <Button onClick={handleCSVExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="csv-import" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Upload CSV File</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Required columns: Date, Pair, Type, Entry, Stop Loss, Take Profit
                </p>
              </div>

              {importPreview.length > 0 && (
                <div>
                  <Label>Preview (First 10 rows)</Label>
                  <div className="mt-2 border rounded-lg overflow-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(importPreview[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value: string | number, i) => (
                              <TableCell key={i}>{value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleImport} 
                className="w-full"
                disabled={!importFile}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Trades
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="pdf-report" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Date</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>To Date</Label>
                  <Input type="date" />
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Report Sections</Label>
                <div className="space-y-2">
                  {Object.entries(selectedSections).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) =>
                          setSelectedSections({ ...selectedSections, [key]: !!checked })
                        }
                      />
                      <label htmlFor={key} className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Custom Notes</Label>
                <Textarea
                  placeholder="Add any custom notes to include in the report..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                />
              </div>

              <Button onClick={handlePDFExport} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF Report
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email-schedule" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Frequency</Label>
                <Select 
                  value={emailSchedule.frequency} 
                  onValueChange={(value) => setEmailSchedule({ ...emailSchedule, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={emailSchedule.email}
                  onChange={(e) => setEmailSchedule({ ...emailSchedule, email: e.target.value })}
                />
              </div>

              <div>
                <Label>Report Type</Label>
                <Select 
                  value={emailSchedule.reportType} 
                  onValueChange={(value) => setEmailSchedule({ ...emailSchedule, reportType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="goals">Goals Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This is a demo UI. Email scheduling functionality requires backend integration.
                </p>
              </div>

              <Button onClick={handleScheduleEmail} className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Schedule Email Reports
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}