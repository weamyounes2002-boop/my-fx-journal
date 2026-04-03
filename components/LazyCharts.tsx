import { lazy, ComponentType } from 'react';
import type { ResponsiveContainerProps } from 'recharts';

// Lazy load recharts components to reduce initial bundle size
export const LazyResponsiveContainer = lazy(() => 
  import('recharts').then(module => ({ 
    default: module.ResponsiveContainer as ComponentType<ResponsiveContainerProps>
  }))
);

export const LazyBarChart = lazy(() => 
  import('recharts').then(module => ({ 
    default: module.BarChart 
  }))
);

export const LazyLineChart = lazy(() => 
  import('recharts').then(module => ({ 
    default: module.LineChart 
  }))
);

export const LazyAreaChart = lazy(() => 
  import('recharts').then(module => ({ 
    default: module.AreaChart 
  }))
);

export const LazyPieChart = lazy(() => 
  import('recharts').then(module => ({ 
    default: module.PieChart 
  }))
);

export const LazyComposedChart = lazy(() => 
  import('recharts').then(module => ({ 
    default: module.ComposedChart 
  }))
);