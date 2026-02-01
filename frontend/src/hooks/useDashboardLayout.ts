import { useState, useCallback, useEffect, useRef } from 'react';
import { DashboardWidget } from '@/types/dashboard.types';
import { dashboardApi } from '@/api/dashboardApi';

export const useDashboardLayout = () => {
  const [layout, setLayout] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(false);

  const loadLayout = async () => {
    try {
      setLoading(true);
      const widgets = await dashboardApi.getUserWidgets();
      setLayout(widgets);
    } catch (error) {
      // Load layout error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadLayout();
  }, []);

  const updateLayout = useCallback(async (newLayout: DashboardWidget[]) => {
    try {
      const saved = await dashboardApi.saveUserWidgets(newLayout);
      setLayout(saved);
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }, []);

  const resetLayout = useCallback(async () => {
    try {
      const defaultWidgets = await dashboardApi.resetUserWidgets();
      setLayout(defaultWidgets);
    } catch (error) {
      console.error('Failed to reset layout:', error);
    }
  }, []);

  const toggleWidget = useCallback((widgetId: string) => {
    setLayout((prev) => {
      const updated = prev.map((widget) =>
        widget.widgetId === widgetId
          ? { ...widget, visible: !widget.visible }
          : widget
      );
      dashboardApi.saveUserWidgets(updated);
      return updated;
    });
  }, []);

  return { layout, updateLayout, resetLayout, toggleWidget, loading };
};