/**
 * The one React error boundary (Phase 35). It wraps `<App />` in
 * src/renderer/main.tsx and nothing else: one boundary at the root is what
 * turns a render-time throw from a permanently white window into one error
 * record and one honest block with a way out.
 *
 * `componentDidCatch` writes one error record through the same bounded
 * writer the window hooks use (./hooks), so the boundary shares the 50 line
 * cap and cannot loop the log. Only the head of the component stack travels,
 * because the full stack of a deep tree is hundreds of lines and the record
 * schema caps serialized fields at 8 KiB in main anyway.
 *
 * The fallback is one centered block on existing tokens. It offers Reload
 * because a render crash is almost always a state the window can leave by
 * starting over, and the sessions themselves live in the tmux server where a
 * renderer crash cannot reach them.
 */

import React from 'react';
import { writeErrorRecord } from './hooks';
import './error-boundary.css';

/** Component-stack frames kept in the record. The head names the culprit. */
const STACK_HEAD_FRAMES = 4;
/** Hard bound on the stack text, well below main's 8 KiB field cap. */
const STACK_HEAD_CHARS = 512;

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/** The first few frames of a React component stack, as one bounded line. */
export function componentStackHead(stack: string | null | undefined): string {
  if (typeof stack !== 'string' || stack.length === 0) return '';
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, STACK_HEAD_FRAMES)
    .join(' ')
    .slice(0, STACK_HEAD_CHARS);
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    writeErrorRecord('renderer', `${error.name}: ${error.message}`, {
      componentStack: componentStackHead(info.componentStack)
    });
  }

  override render(): React.ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="errb-shell" role="alert">
        <div className="errb-block">
          <div className="errb-heading">This view hit an error.</div>
          <div className="errb-body">The details were written to the log.</div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
