import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Terjadi kesalahan rendering pada halaman.",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Terjadi Kesalahan Tampilan
          </h1>
          <p className="mt-2 max-w-md text-sm text-slate-600">{this.state.errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <RotateCcw className="h-4 w-4" />
            Muat Ulang Halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

