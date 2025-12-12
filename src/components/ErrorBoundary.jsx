import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-background min-h-screen text-foreground">
                    <h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong.</h1>
                    <p className="mb-4 text-muted-foreground">The application encountered a critical error. Please see the console for details.</p>
                    <div className="bg-muted p-4 rounded overflow-auto mb-4">
                        <code className="text-sm">{this.state.error && this.state.error.toString()}</code>
                        <br />
                        <pre className="text-xs mt-2">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                    </div>
                    <button
                        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
