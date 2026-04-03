// React hook for Google Analytics
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';

/**
 * Hook to automatically track page views on route changes
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search, document.title);
  }, [location]);
}

/**
 * Hook to track component mount/unmount
 */
export function useComponentTracking(componentName: string) {
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      console.log(`${componentName} was active for ${duration}ms`);
    };
  }, [componentName]);
}