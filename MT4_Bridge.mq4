//+------------------------------------------------------------------+
//|                                                   MT4_Bridge.mq4 |
//|                                      My FX Journal MT4 Bridge EA |
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
int syncTimer = 0;
string logPrefix = "[MT4 Bridge] ";

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
    Print(logPrefix + "Account: ", AccountNumber());
    Print(logPrefix + "Server: ", AccountServer());
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
    json += "\"account_info\":{";
    json += "\"balance\":" + DoubleToString(AccountBalance(), 2) + ",";
    json += "\"equity\":" + DoubleToString(AccountEquity(), 2) + ",";
    json += "\"margin\":" + DoubleToString(AccountMargin(), 2) + ",";
    json += "\"free_margin\":" + DoubleToString(AccountFreeMargin(), 2) + ",";
    json += "\"margin_level\":" + DoubleToString(AccountMargin() > 0 ? (AccountEquity() / AccountMargin() * 100) : 0, 2);
    json += "},";
    
    // Add trades array
    json += "\"trades\":[";
    
    int totalTrades = 0;
    int historyTotal = OrdersHistoryTotal();
    
    // Fetch closed trades from history
    for(int i = 0; i < historyTotal; i++)
    {
        if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
        {
            // Only include actual trades (not balance operations)
            if(OrderType() <= 1) // 0=Buy, 1=Sell
            {
                if(totalTrades > 0)
                    json += ",";
                
                json += "{";
                json += "\"ticket\":" + IntegerToString(OrderTicket()) + ",";
                json += "\"symbol\":\"" + OrderSymbol() + "\",";
                json += "\"type\":\"" + (OrderType() == OP_BUY ? "buy" : "sell") + "\",";
                json += "\"lots\":" + DoubleToString(OrderLots(), 2) + ",";
                json += "\"open_price\":" + DoubleToString(OrderOpenPrice(), 5) + ",";
                json += "\"close_price\":" + DoubleToString(OrderClosePrice(), 5) + ",";
                json += "\"open_time\":\"" + TimeToString(OrderOpenTime(), TIME_DATE|TIME_SECONDS) + "\",";
                json += "\"close_time\":\"" + TimeToString(OrderCloseTime(), TIME_DATE|TIME_SECONDS) + "\",";
                json += "\"profit\":" + DoubleToString(OrderProfit(), 2) + ",";
                json += "\"commission\":" + DoubleToString(OrderCommission(), 2) + ",";
                json += "\"swap\":" + DoubleToString(OrderSwap(), 2) + ",";
                json += "\"stop_loss\":" + DoubleToString(OrderStopLoss(), 5) + ",";
                json += "\"take_profit\":" + DoubleToString(OrderTakeProfit(), 5);
                json += "}";
                
                totalTrades++;
            }
        }
    }
    
    // Add open positions
    int openTotal = OrdersTotal();
    for(int i = 0; i < openTotal; i++)
    {
        if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
        {
            if(OrderType() <= 1) // 0=Buy, 1=Sell
            {
                if(totalTrades > 0)
                    json += ",";
                
                json += "{";
                json += "\"ticket\":" + IntegerToString(OrderTicket()) + ",";
                json += "\"symbol\":\"" + OrderSymbol() + "\",";
                json += "\"type\":\"" + (OrderType() == OP_BUY ? "buy" : "sell") + "\",";
                json += "\"lots\":" + DoubleToString(OrderLots(), 2) + ",";
                json += "\"open_price\":" + DoubleToString(OrderOpenPrice(), 5) + ",";
                json += "\"close_price\":null,";
                json += "\"open_time\":\"" + TimeToString(OrderOpenTime(), TIME_DATE|TIME_SECONDS) + "\",";
                json += "\"close_time\":null,";
                json += "\"profit\":" + DoubleToString(OrderProfit(), 2) + ",";
                json += "\"commission\":" + DoubleToString(OrderCommission(), 2) + ",";
                json += "\"swap\":" + DoubleToString(OrderSwap(), 2) + ",";
                json += "\"stop_loss\":" + DoubleToString(OrderStopLoss(), 5) + ",";
                json += "\"take_profit\":" + DoubleToString(OrderTakeProfit(), 5);
                json += "}";
                
                totalTrades++;
            }
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