import MetaApi from 'metaapi.cloud-sdk';

// MetaAPI token from environment (server-side only)
const METAAPI_TOKEN = process.env.METAAPI_TOKEN || '';

// Initialize MetaAPI client
let metaApiClient: MetaApi | null = null;

const getMetaApiClient = () => {
  if (!metaApiClient && METAAPI_TOKEN) {
    metaApiClient = new MetaApi(METAAPI_TOKEN);
  }
  return metaApiClient;
};

export interface CreateAccountParams {
  login: string;
  password: string;
  server: string;
  platform: 'mt4' | 'mt5';
  name: string;
  magic?: number;
}

export interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  leverage: number;
  currency: string;
  name: string;
  server: string;
  login: string;
}

export interface TradePosition {
  id: string;
  type: 'POSITION_TYPE_BUY' | 'POSITION_TYPE_SELL';
  symbol: string;
  magic: number;
  time: string;
  brokerTime: string;
  updateTime: string;
  openPrice: number;
  currentPrice: number;
  currentTickValue: number;
  stopLoss?: number;
  takeProfit?: number;
  volume: number;
  swap: number;
  profit: number;
  commission: number;
  comment?: string;
}

export interface HistoryOrder {
  id: string;
  type: string;
  state: string;
  symbol: string;
  magic: number;
  time: string;
  brokerTime: string;
  doneTime: string;
  doneBrokerTime: string;
  volume: number;
  currentVolume: number;
  positionId: string;
  platform: string;
  comment?: string;
  clientId?: string;
  openPrice?: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  profit?: number;
  commission?: number;
  swap?: number;
}

/**
 * Create a new MetaAPI trading account
 */
export const createMetaApiAccount = async (params: CreateAccountParams) => {
  try {
    const api = getMetaApiClient();
    if (!api) {
      throw new Error('MetaAPI client not initialized');
    }
    
    const accountsApi = api.metatraderAccountApi;

    console.log('Creating MetaAPI account:', { login: params.login, server: params.server, platform: params.platform });

    // Create account
    const account = await accountsApi.createAccount({
      name: params.name,
      type: 'cloud',
      login: params.login,
      password: params.password,
      server: params.server,
      platform: params.platform,
      magic: params.magic || 0,
      application: 'MetaApi',
      reliability: 'regular'
    });

    console.log('MetaAPI account created:', account.id);

    return {
      success: true,
      accountId: account.id,
      data: account
    };
  } catch (error) {
    console.error('Error creating MetaAPI account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create MetaAPI account'
    };
  }
};

/**
 * Deploy a MetaAPI account to start synchronization
 */
export const deployAccount = async (accountId: string) => {
  try {
    const api = getMetaApiClient();
    if (!api) {
      throw new Error('MetaAPI client not initialized');
    }
    
    const accountsApi = api.metatraderAccountApi;

    console.log('Deploying MetaAPI account:', accountId);

    const account = await accountsApi.getAccount(accountId);
    await account.deploy();

    console.log('MetaAPI account deployed:', accountId);

    // Wait for deployment to complete (with timeout)
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedAccount = await accountsApi.getAccount(accountId);
      
      if (updatedAccount.state === 'DEPLOYED') {
        console.log('MetaAPI account deployment completed:', accountId);
        return {
          success: true,
          accountId,
          state: 'DEPLOYED'
        };
      }
      
      attempts++;
    }

    return {
      success: false,
      error: 'Deployment timeout - account is still deploying. Please wait a moment and try syncing again.'
    };
  } catch (error) {
    console.error('Error deploying MetaAPI account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deploy MetaAPI account'
    };
  }
};

/**
 * Wait for account connection to be established
 */
export const waitForConnection = async (accountId: string, timeoutSeconds: number = 60) => {
  try {
    const api = getMetaApiClient();
    if (!api) {
      throw new Error('MetaAPI client not initialized');
    }
    
    const accountsApi = api.metatraderAccountApi;
    const account = await accountsApi.getAccount(accountId);
    
    console.log('Waiting for connection:', accountId);
    
    const connection = account.getRPCConnection();
    await connection.connect();
    await connection.waitSynchronized({ timeoutInSeconds: timeoutSeconds });
    
    console.log('Connection established:', accountId);
    
    return {
      success: true,
      connection
    };
  } catch (error) {
    console.error('Error waiting for connection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to establish connection'
    };
  }
};

/**
 * Get account information
 */
export const getAccountInfo = async (accountId: string): Promise<{ success: boolean; data?: AccountInfo; error?: string }> => {
  try {
    const api = getMetaApiClient();
    if (!api) {
      throw new Error('MetaAPI client not initialized');
    }
    
    const accountsApi = api.metatraderAccountApi;
    const account = await accountsApi.getAccount(accountId);
    
    // Get connection
    const connection = account.getRPCConnection();
    
    // Check if connected
    if (!connection.synchronized) {
      await connection.connect();
      await connection.waitSynchronized({ timeoutInSeconds: 30 });
    }
    
    // Get account information
    const accountInfo = await connection.getAccountInformation();
    
    return {
      success: true,
      data: {
        balance: accountInfo.balance,
        equity: accountInfo.equity,
        margin: accountInfo.margin,
        freeMargin: accountInfo.freeMargin,
        leverage: accountInfo.leverage,
        currency: accountInfo.currency,
        name: accountInfo.name,
        server: accountInfo.server,
        login: String(accountInfo.login)
      }
    };
  } catch (error) {
    console.error('Error getting account info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get account information'
    };
  }
};

/**
 * Get open positions
 */
export const getPositions = async (accountId: string): Promise<{ success: boolean; data?: TradePosition[]; error?: string }> => {
  try {
    const api = getMetaApiClient();
    if (!api) {
      throw new Error('MetaAPI client not initialized');
    }
    
    const accountsApi = api.metatraderAccountApi;
    const account = await accountsApi.getAccount(accountId);
    
    const connection = account.getRPCConnection();
    
    if (!connection.synchronized) {
      await connection.connect();
      await connection.waitSynchronized({ timeoutInSeconds: 30 });
    }
    
    const positions = await connection.getPositions();
    
    return {
      success: true,
      data: positions as TradePosition[]
    };
  } catch (error) {
    console.error('Error getting positions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get positions'
    };
  }
};

/**
 * Get history orders (completed trades)
 */
export const getHistoryOrders = async (
  accountId: string, 
  startTime?: Date, 
  endTime?: Date
): Promise<{ success: boolean; data?: HistoryOrder[]; error?: string }> => {
  try {
    const api = getMetaApiClient();
    if (!api) {
      throw new Error('MetaAPI client not initialized');
    }
    
    const accountsApi = api.metatraderAccountApi;
    const account = await accountsApi.getAccount(accountId);
    
    const connection = account.getRPCConnection();
    
    if (!connection.synchronized) {
      await connection.connect();
      await connection.waitSynchronized({ timeoutInSeconds: 30 });
    }
    
    // Get history orders
    const historyOrders = await connection.getHistoryOrdersByTimeRange(
      startTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
      endTime || new Date()
    );
    
    return {
      success: true,
      data: historyOrders as HistoryOrder[]
    };
  } catch (error) {
    console.error('Error getting history orders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get history orders'
    };
  }
};

/**
 * Remove (undeploy and delete) a MetaAPI account
 */
export const removeAccount = async (accountId: string) => {
  try {
    const api = getMetaApiClient();
    if (!api) {
      throw new Error('MetaAPI client not initialized');
    }
    
    const accountsApi = api.metatraderAccountApi;
    const account = await accountsApi.getAccount(accountId);
    
    console.log('Removing MetaAPI account:', accountId);
    
    // Undeploy first
    if (account.state === 'DEPLOYED') {
      await account.undeploy();
      
      // Wait for undeployment
      let attempts = 0;
      while (attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const updatedAccount = await accountsApi.getAccount(accountId);
        if (updatedAccount.state === 'UNDEPLOYED') {
          break;
        }
        attempts++;
      }
    }
    
    // Delete account
    await account.remove();
    
    console.log('MetaAPI account removed:', accountId);
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error removing MetaAPI account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove MetaAPI account'
    };
  }
};

/**
 * Check account connection status
 */
export const checkConnectionStatus = async (accountId: string) => {
  try {
    const api = getMetaApiClient();
    if (!api) {
      throw new Error('MetaAPI client not initialized');
    }
    
    const accountsApi = api.metatraderAccountApi;
    const account = await accountsApi.getAccount(accountId);
    
    return {
      success: true,
      state: account.state,
      connectionStatus: account.connectionStatus,
      synchronized: account.state === 'DEPLOYED' && account.connectionStatus === 'CONNECTED'
    };
  } catch (error) {
    console.error('Error checking connection status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check connection status'
    };
  }
};