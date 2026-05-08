import { Component } from 'react';
import PropTypes from 'prop-types';
import logger from '../lib/logger';

/**
 * ErrorBoundary — catches render errors in the itinerary subtree and shows
 * a graceful fallback instead of a blank/crashed screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <ItinerarySection />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logger.error('ErrorBoundary caught a render error', error, info);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary-icon">⚠️</div>
          <h3 className="error-boundary-title">Something went wrong</h3>
          <p className="error-boundary-msg">
            The itinerary couldn't be displayed. Try regenerating your trip.
          </p>
          <button
            className="error-boundary-btn"
            onClick={this.handleReset}
            aria-label="Dismiss error and try again"
          >
            🔄 Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  /** Content to protect from render errors. */
  children: PropTypes.node.isRequired,
  /** Optional callback invoked when the user clicks "Try Again". */
  onReset: PropTypes.func,
};

ErrorBoundary.defaultProps = {
  onReset: undefined,
};
