import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error(error);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'Microsoft JhengHei, Arial, sans-serif', color: '#0f172a' }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>\u9801\u9762\u767c\u751f\u932f\u8aa4</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', border: '1px solid #e2e8f0', padding: 12 }}>{String(this.state.error?.message || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener("error", (event) => {
  console.error(event.error || event.message);
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
