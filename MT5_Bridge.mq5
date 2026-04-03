//+------------------------------------------------------------------+
//|                                                   MT5_Bridge.mq5 |
//|                                      My FX Journal MT5 Bridge EA |
//|                                   Syncs trades to web application |
//+------------------------------------------------------------------+
#property copyright "My FX Journal"
#property link      "https://myfxjournal.com"
#property version   "1.00"
#property strict

//--- Input parameters
input string API_URL = "https://your-app-url.com/api/mt/sync-trades"; // API endpoint URL
input string CONNECTION_ID = ""; // Connection ID from web app
input int SYNC_INTERVAL = 300; // Sync interval in seconds (default: 5 minutes)
input bool ENABLE_LOGGING = true; // Enable detailed logging

//--- Global variables
datetime lastSyncTime = 0;
string logPrefix = "[MT5 Bridge] ";

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
    // Validate input parameters
    if(StringLen(API_URL) == 0)
    {
        Print(logPrefix + "ERROR: API_URL is not set. Please configure in EA settings.");
        return(INIT_PARAMETERS_INCORRECT);
    }
    
    if(StringLen(CONNECTION_ID) == 0)
    {
        Print(logPrefix + "ERROR: CONNECTION_ID is not set. Please get it from web app.");
        return(INIT_PARAMETERS_INCORRECT);
    }
    
    if(SYNC_INTERVAL < 60)
    {
        Print(logPrefix + "WARNING: SYNC_INTERVAL too short. Minimum is 60 seconds.");
        return(INIT_PARAMETERS_INCORRECT);
    }
    
    // Set up timer
    EventSetTimer(SYNC_INTERVAL);
    
    Print(logPrefix + "Initialized successfully");
    Print(logPrefix + "Account: ", AccountInfoInteger(ACCOUNT_LOGIN));
    Print(logPrefix + "Server: ", AccountInfoString(ACCOUNT_SERVER));
    Print(logPrefix + "Sync interval: ", SYNC_INTERVAL, " seconds");
    
    // Perform initial sync
    SyncTrades();
    
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    EventKillTimer();
    Print(logPrefix + "Deinitialized. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Timer function - called every SYNC_INTERVAL seconds              |
//+------------------------------------------------------------------+
void OnTimer()
{
    SyncTrades();
}

//+------------------------------------------------------------------+
//| Main sync function                                                |
//+------------------------------------------------------------------+
void SyncTrades()
{
    if(ENABLE_LOGGING)
        Print(logPrefix + "Starting sync...");
    
    // Build JSON payload
    string jsonPayload = BuildJsonPayload();
    
    if(StringLen(jsonPayload) == 0)
    {
        Print(logPrefix + "ERROR: Failed to build JSON payload");
        return;
    }
    
    // Send to API
    bool success = SendToAPI(jsonPayload);
    
    if(success)
    {
        lastSyncTime = TimeCurrent();
        if(ENABLE_LOGGING)
            Print(logPrefix + "Sync completed successfully at ", TimeToString(lastSyncTime));
    }
    else
    {
        Print(logPrefix + "ERROR: Sync failed");
    }
}

//+------------------------------------------------------------------+
//| Build JSON payload with account info and trades                  |
//+------------------------------------------------------------------+
string BuildJsonPayload()
{
    string json = "{";
    
    // Add connection ID
    json += "\"connection_id\":\"" + CONNECTION_ID + "\",";
    
    // Add account info
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    double equity = AccountInfoDouble(ACCOUNT_EQUITY);
    double margin = AccountInfoDouble(ACCOUNT_MARGIN);
    double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
    double marginLevel = margin > 0 ? (equity / margin * 100) : 0;
    
    json += "\"account_info\":{";
    json += "\"balance\":" + DoubleToString(balance, 2) + ",";
    json += "\"equity\":" + DoubleToString(equity, 2) + ",";
    json += "\"margin\":" + DoubleToString(margin, 2) + ",";
    json += "\"free_margin\":" + DoubleToString(freeMargin, 2) + ",";
    json += "\"margin_level\":" + DoubleToString(marginLevel, 2);
    json += "},";
    
    // Add trades array
    json += "\"trades\":[";
    
    int totalTrades = 0;
    
    // Select history for the last 90 days
    datetime fromDate = TimeCurrent() - (90 * 24 * 60 * 60);
    datetime toDate = TimeCurrent();
    
    if(HistorySelect(fromDate, toDate))
    {
        int dealsTotal = HistoryDealsTotal();
        
        // Process deals (MT5 uses deals instead of orders)
        for(int i = 0; i < dealsTotal; i++)
        {
            ulong dealTicket = HistoryDealGetTicket(i);
            
            if(dealTicket > 0)
            {
                // Get deal properties
                long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
                long dealEntry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
                
                // Only include buy/sell deals
                if(dealType == DEAL_TYPE_BUY || dealType == DEAL_TYPE_SELL)
                {
                    if(totalTrades > 0)
                        json += ",";
                    
                    string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
                    double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
                    double price = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
                    datetime time = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
                    double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
                    double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
                    double swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
                    ulong positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
                    
                    json += "{";
                    json += "\"ticket\":" + IntegerToString(dealTicket) + ",";
                    json += "\"position_id\":" + IntegerToString(positionId) + ",";
                    json += "\"symbol\":\"" + symbol + "\",";
                    json += "\"type\":\"" + (dealType == DEAL_TYPE_BUY ? "buy" : "sell") + "\",";
                    json += "\"lots\":" + DoubleToString(volume, 2) + ",";
                    json += "\"open_price\":" + DoubleToString(price, 5) + ",";
                    
                    // For MT5, we need to match entry/exit deals
                    if(dealEntry == DEAL_ENTRY_OUT)
                    {
                        json += "\"close_price\":" + DoubleToString(price, 5) + ",";
                        json += "\"close_time\":\"" + TimeToString(time, TIME_DATE|TIME_SECONDS) + "\",";
                    }
                    else
                    {
                        json += "\"close_price\":null,";
                        json += "\"close_time\":null,";
                    }
                    
                    json += "\"open_time\":\"" + TimeToString(time, TIME_DATE|TIME_SECONDS) + "\",";
                    json += "\"profit\":" + DoubleToString(profit, 2) + ",";
                    json += "\"commission\":" + DoubleToString(commission, 2) + ",";
                    json += "\"swap\":" + DoubleToString(swap, 2) + ",";
                    json += "\"stop_loss\":0,";
                    json += "\"take_profit\":0";
                    json += "}";
                    
                    totalTrades++;
                }
            }
        }
    }
    
    // Add open positions
    int positionsTotal = PositionsTotal();
    for(int i = 0; i < positionsTotal; i++)
    {
        ulong positionTicket = PositionGetTicket(i);
        
        if(positionTicket > 0)
        {
            if(totalTrades > 0)
                json += ",";
            
            string symbol = PositionGetString(POSITION_SYMBOL);
            long posType = PositionGetInteger(POSITION_TYPE);
            double volume = PositionGetDouble(POSITION_VOLUME);
            double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
            double currentPrice = PositionGetDouble(POSITION_PRICE_CURRENT);
            datetime openTime = (datetime)PositionGetInteger(POSITION_TIME);
            double profit = PositionGetDouble(POSITION_PROFIT);
            double commission = PositionGetDouble(POSITION_COMMISSION);
            double swap = PositionGetDouble(POSITION_SWAP);
            double sl = PositionGetDouble(POSITION_SL);
            double tp = PositionGetDouble(POSITION_TP);
            
            json += "{";
            json += "\"ticket\":" + IntegerToString(positionTicket) + ",";
            json += "\"symbol\":\"" + symbol + "\",";
            json += "\"type\":\"" + (posType == POSITION_TYPE_BUY ? "buy" : "sell") + "\",";
            json += "\"lots\":" + DoubleToString(volume, 2) + ",";
            json += "\"open_price\":" + DoubleToString(openPrice, 5) + ",";
            json += "\"close_price\":null,";
            json += "\"open_time\":\"" + TimeToString(openTime, TIME_DATE|TIME_SECONDS) + "\",";
            json += "\"close_time\":null,";
            json += "\"profit\":" + DoubleToString(profit, 2) + ",";
            json += "\"commission\":" + DoubleToString(commission, 2) + ",";
            json += "\"swap\":" + DoubleToString(swap, 2) + ",";
            json += "\"stop_loss\":" + DoubleToString(sl, 5) + ",";
            json += "\"take_profit\":" + DoubleToString(tp, 5);
            json += "}";
            
            totalTrades++;
        }
    }
    
    json += "]";
    json += "}";
    
    if(ENABLE_LOGGING)
        Print(logPrefix + "Built payload with ", totalTrades, " trades");
    
    return json;
}

//+------------------------------------------------------------------+
//| Send JSON data to API endpoint                                    |
//+------------------------------------------------------------------+
bool SendToAPI(string jsonData)
{
    string headers = "Content-Type: application/json\r\n";
    char post[];
    char result[];
    string resultHeaders;
    
    // Convert JSON string to char array
    StringToCharArray(jsonData, post, 0, StringLen(jsonData));
    
    // Reset last error
    ResetLastError();
    
    // Send HTTP POST request
    int timeout = 5000; // 5 seconds timeout
    int res = WebRequest(
        "POST",
        API_URL,
        headers,
        timeout,
        post,
        result,
        resultHeaders
    );
    
    // Check for errors
    if(res == -1)
    {
        int error = GetLastError();
        Print(logPrefix + "ERROR: WebRequest failed. Error code: ", error);
        
        if(error == 4060)
        {
            Print(logPrefix + "ERROR: URL not allowed. Add ", API_URL, " to Tools->Options->Expert Advisors->Allow WebRequest for listed URL");
        }
        
        return false;
    }
    
    // Parse response
    string response = CharArrayToString(result);
    
    if(ENABLE_LOGGING)
    {
        Print(logPrefix + "HTTP Response Code: ", res);
        Print(logPrefix + "Response: ", response);
    }
    
    // Check if request was successful (HTTP 200)
    if(res >= 200 && res < 300)
    {
        return true;
    }
    else
    {
        Print(logPrefix + "ERROR: Server returned error code: ", res);
        return false;
    }
}

//+------------------------------------------------------------------+
//| Expert tick function - not used, but required                     |
//+------------------------------------------------------------------+
void OnTick()
{
    // Not used - sync is timer-based
}

//+------------------------------------------------------------------+
//| Helper function to escape JSON strings                            |
//+------------------------------------------------------------------+
string JsonEscape(string str)
{
    string result = str;
    StringReplace(result, "\\", "\\\\");
    StringReplace(result, "\"", "\\\"");
    StringReplace(result, "\n", "\\n");
    StringReplace(result, "\r", "\\r");
    StringReplace(result, "\t", "\\t");
    return result;
}
//+------------------------------------------------------------------+