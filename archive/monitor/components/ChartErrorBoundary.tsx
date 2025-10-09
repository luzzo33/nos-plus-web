'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (err: unknown) => void;
};

type State = { hasError: boolean };

export default class ChartErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    if (this.props.onError) this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children as any;
  }
}
