import React from 'react';
export default class ErrorBoundary extends React.Component {
  state = {
    failed: false
  };
  static getDerivedStateFromError() {
    return {
      failed: true
    };
  }
  componentDidCatch(error) {
    console.error('StudentOS view failed:', error.message);
  }
  render() {
    return this.state.failed ? <main className="account-access"><section className="card"><h1>This screen needs a fresh start.</h1><p>Your saved work remains on the server. Reload the workspace and reopen your activity.</p><button className="btn btn-primary" onClick={() => location.reload()}>Reload StudentOS</button></section></main> : this.props.children;
  }
}
