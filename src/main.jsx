import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class EstimatorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Estimator render failed", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="auth-shell">
          <div className="auth-card card">
            <div className="brand-lockup auth-lockup">
              <img className="brand-logo" src="/logo-mark.png" alt="S&S Design Build" />
              <div>
                <h1>Estimator could not load</h1>
                <p className="small-note">A page error was caught instead of showing a blank screen.</p>
              </div>
            </div>
            <div className="auth-error">
              {this.state.error?.message || "Unknown page error."}
            </div>
            <button className="auth-submit" type="button" onClick={() => window.location.reload()}>
              Reload estimator
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EstimatorErrorBoundary>
      <App />
    </EstimatorErrorBoundary>
  </React.StrictMode>
);
