import React from 'react';
export default class ErrorBoundary extends React.Component {
  state = {
    failed: false
  };
  static getDerivedStateFromError(error) {
    return {
      failed: true,
      update: /dynamically imported module|Importing a module script|Loading chunk/i.test(error.message)
    };
  }
  componentDidCatch(error) {
    console.error('StudentOS view failed:', error.message);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const Wrapper = this.props.embedded ? 'section' : 'main';
    return <Wrapper className={this.props.embedded ? 'view-recovery card' : 'account-access'}><section role="alert"><h1>{this.state.update ? 'A new version is ready.' : 'This workspace could not be displayed.'}</h1><p>{this.state.update ? 'Reload to open the latest StudentOS update. Your saved work will be kept.' : 'Reload the workspace and reopen this activity. Your saved work remains on the server.'}</p><button className="btn btn-primary" onClick={() => location.reload()}>Reload StudentOS</button></section></Wrapper>;
  }
}
