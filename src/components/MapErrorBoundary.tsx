"use client";

import { Component, type ReactNode } from "react";

/**
 * Keeps a failure inside the map from taking down the whole Browse page.
 *
 * It also exists to make the next failure diagnosable. A server error
 * reaches the reader as an opaque digest, but a client-side error still
 * carries its real message — so that message is shown here rather than
 * swallowed, which is the difference between "something went wrong" and
 * knowing which library threw.
 */
export default class MapErrorBoundary extends Component<
  {
    children: ReactNode;
    title: string;
    body: string;
    detailLabel: string;
  },
  { message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error("Browse map failed to render", error);
  }

  render() {
    if (this.state.message === null) return this.props.children;

    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
        <p className="font-medium">{this.props.title}</p>
        <p className="text-sm text-muted">{this.props.body}</p>
        <p className="text-xs text-muted" dir="ltr">
          {this.props.detailLabel}: {this.state.message}
        </p>
      </div>
    );
  }
}
