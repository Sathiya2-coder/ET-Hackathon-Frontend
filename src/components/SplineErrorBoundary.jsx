import React from 'react';
import { AlertCircle, RotateCcw, Download } from 'lucide-react';

export class SplineErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Spline Load Error Captured:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center p-8 text-center bg-white/[0.02] border border-dashed border-[#eab308]/30 rounded-3xl backdrop-blur-md relative overflow-hidden">
          {/* Subtle golden background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#eab308]/5 to-transparent pointer-events-none"></div>
          
          <AlertCircle className="w-12 h-12 text-[#eab308] mb-4 animate-bounce" />
          
          <h3 className="text-lg font-bold tracking-wider mb-2 text-white uppercase">
            3D Scene Load Interrupted
          </h3>
          
          <p className="text-xs text-gray-400 max-w-sm mb-6 leading-relaxed">
            The Spline server returned a <span className="text-[#eab308] font-semibold">403 Forbidden</span> or version mismatch error (<span className="text-[#eab308] font-mono">End of buffer not reached</span>).
          </p>

          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-left max-w-md mb-6 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase flex items-center space-x-1.5">
              <span>🔧</span>
              <span>How to solve this:</span>
            </h4>
            <ol className="list-decimal list-inside text-[11px] text-gray-400 space-y-2 leading-relaxed">
              <li>Open your scene in the <a href="https://app.spline.design/" target="_blank" rel="noopener noreferrer" className="text-[#eab308] hover:underline font-semibold">Spline Editor</a>.</li>
              <li>Click <strong>Export</strong> &rarr; <strong>Code</strong> &rarr; <strong>React</strong> &rarr; click <strong>Download</strong> to get the <code className="bg-white/5 px-1 py-0.5 rounded font-mono text-[10px] text-white">scene.splinecode</code> file.</li>
              <li>Move the downloaded file into your project's <code className="bg-white/5 px-1 py-0.5 rounded font-mono text-[10px] text-white">public/</code> folder.</li>
              <li>Update your code in <code className="bg-white/5 px-1 py-0.5 rounded font-mono text-[10px] text-white">src/App.jsx</code> to load:
                <pre className="bg-black/50 p-2 rounded mt-1 text-[10px] text-gray-300 font-mono overflow-x-auto">
                  const splineSceneUrl = "/scene.splinecode";
                </pre>
              </li>
            </ol>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-full text-xs font-bold tracking-wider bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-300 flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Load</span>
            </button>
            
            <a 
              href="https://community.spline.design/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-full text-xs font-bold tracking-wider bg-[#eab308] text-black hover:bg-yellow-400 transition-all duration-300 flex items-center space-x-1.5 font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Browse Spline Community</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default SplineErrorBoundary;
