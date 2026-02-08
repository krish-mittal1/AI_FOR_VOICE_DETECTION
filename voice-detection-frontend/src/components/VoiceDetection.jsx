import { useState, useRef } from 'react';

// Constants
const LANGUAGES = [
    { value: 'English', label: 'English' },
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Tamil', label: 'Tamil' },
    { value: 'Telugu', label: 'Telugu' },
    { value: 'Malayalam', label: 'Malayalam' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Reusable style constants
const styles = {
    card: 'bg-gray-900/60 backdrop-blur-2xl border border-gray-800/80 rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-black/40 ring-1 ring-white/5',
    label: 'block text-sm font-semibold text-gray-200 tracking-wide uppercase',
    input: 'w-full appearance-none bg-gray-800/60 border border-gray-700/80 rounded-xl px-5 py-4 text-gray-100 text-base font-medium transition-all duration-200 cursor-pointer hover:bg-gray-800/80 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500',
    btnBase: 'rounded-2xl font-bold text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
    btnDisabled: 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-60',
    btnPrimary: 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-[1.02] active:scale-[0.98] focus:ring-violet-500',
    btnSecondary: 'bg-gray-800/80 text-gray-300 border border-gray-700/80 hover:bg-gray-700/80 hover:text-white hover:border-gray-600 focus:ring-gray-500',
};

// Helper: Format file size
const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper: Get user-friendly error message
const getErrorMessage = (error) => {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    if (error.name === 'AbortError') {
        return 'Request timed out. Please try again.';
    }
    return error.message || 'An unexpected error occurred. Please try again.';
};

// Sub-components
const Icon = ({ path, className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
);

const Spinner = () => (
    <div className="relative w-6 h-6">
        <div className="absolute inset-0 rounded-full border-2 border-white/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
    </div>
);

const StatusMessage = ({ type, title, message }) => {
    const isError = type === 'error';

    return (
        <div className={`flex items-start gap-4 p-5 rounded-2xl ${isError ? 'bg-red-950/50 border border-red-500/40' : 'bg-emerald-950/50 border border-emerald-500/40'}`}>
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ring-1 ${isError ? 'bg-red-500/20 ring-red-500/30' : 'bg-emerald-500/20 ring-emerald-500/30'}`}>
                <Icon
                    path={isError ? 'M6 18L18 6M6 6l12 12' : 'M5 13l4 4L19 7'}
                    className={`w-5 h-5 ${isError ? 'text-red-400' : 'text-emerald-400'}`}
                />
            </div>
            <div className="flex-1 pt-1">
                <p className={`text-sm font-semibold ${isError ? 'text-red-300' : 'text-emerald-300'}`}>{title}</p>
                <p className={`text-sm mt-1 ${isError ? 'text-red-400/90' : 'text-emerald-400/90'}`}>{message}</p>
            </div>
        </div>
    );
};

// Main Component
export default function VoiceDetection() {
    const [file, setFile] = useState(null);
    const [language, setLanguage] = useState('English');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);

    // Validation
    const validateFile = (selectedFile) => {
        if (!selectedFile) return null;
        if (selectedFile.type !== 'audio/mpeg') return 'Please upload an MP3 file only.';
        if (selectedFile.size > MAX_FILE_SIZE) {
            return `File size exceeds 10MB limit. Your file is ${formatFileSize(selectedFile.size)}.`;
        }
        return null;
    };

    // Handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const processFile = (selectedFile) => {
        const validationError = validateFile(selectedFile);
        if (validationError) {
            setError(validationError);
            setFile(null);
        } else {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        processFile(e.dataTransfer.files?.[0]);
    };

    const handleFileChange = (e) => processFile(e.target.files?.[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select an MP3 file.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);
        setResponse(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('language', language);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        try {
            const res = await fetch(`${API_URL}/api/voice-detection/upload`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.detail || `Server error: ${res.status}`);
            }

            const data = await res.json();
            setResponse(data);
            setSuccess(true);
        } catch (err) {
            clearTimeout(timeoutId);
            setError(getErrorMessage(err));
            setSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setResponse(null);
        setError(null);
        setSuccess(false);
        setLanguage('English');
        if (inputRef.current) inputRef.current.value = '';
    };

    const clearFile = () => {
        setFile(null);
        setResponse(null);
        setError(null);
        setSuccess(false);
        if (inputRef.current) inputRef.current.value = '';
    };

    // Computed
    const isSubmitDisabled = isLoading || !file;

    const dropzoneClasses = `
    relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center 
    transition-all duration-300 cursor-pointer group
    ${dragActive ? 'border-violet-400 bg-violet-500/15 scale-[1.02]' : ''}
    ${!dragActive && file ? 'border-emerald-500/60 bg-emerald-500/10' : ''}
    ${!dragActive && !file ? 'border-gray-700/80 hover:border-gray-500 hover:bg-gray-800/40' : ''}
  `;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 text-gray-100 px-4 py-10 sm:py-16 antialiased">
            <div className="max-w-xl mx-auto">
                {/* Header */}
                <header className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 mb-6 shadow-2xl shadow-violet-600/30 ring-1 ring-white/10 transition-transform duration-300 hover:scale-105">
                        <Icon
                            path="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            className="w-10 h-10 text-white drop-shadow-lg"
                        />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                        Voice Detection
                    </h1>
                    <p className="mt-4 text-gray-400 text-base sm:text-lg font-light max-w-sm mx-auto leading-relaxed">
                        Upload an MP3 file to analyze voice patterns with AI
                    </p>
                </header>

                {/* Main Card */}
                <main className={styles.card}>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* File Upload */}
                        <fieldset className="space-y-3">
                            <label className={styles.label}>Audio File</label>
                            <div
                                className={dropzoneClasses}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => inputRef.current?.click()}
                                role="button"
                                tabIndex={0}
                                aria-label="Upload audio file"
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".mp3,audio/mpeg"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    aria-hidden="true"
                                />

                                {file ? (
                                    <FilePreview file={file} onClear={clearFile} />
                                ) : (
                                    <DropzoneEmpty />
                                )}
                            </div>
                        </fieldset>

                        {/* Language Selector */}
                        <fieldset className="space-y-3">
                            <label htmlFor="language" className={styles.label}>Language</label>
                            <div className="relative">
                                <select
                                    id="language"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className={styles.input}
                                >
                                    {LANGUAGES.map((lang) => (
                                        <option key={lang.value} value={lang.value} className="bg-gray-900 py-2">
                                            {lang.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <Icon path="M19 9l-7 7-7-7" />
                                </div>
                            </div>
                        </fieldset>

                        {/* Status Messages */}
                        {error && <StatusMessage type="error" title="Error" message={error} />}
                        {success && response && (
                            <StatusMessage type="success" title="Success" message="Voice analysis completed successfully." />
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className={`flex-1 py-4 px-6 ${styles.btnBase} ${isSubmitDisabled ? styles.btnDisabled : styles.btnPrimary}`}
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner />
                                        <span>Analyzing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon path="M9 5l7 7-7 7" />
                                        <span>Analyze Voice</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleReset}
                                disabled={isLoading}
                                className={`px-6 py-4 ${styles.btnBase} ${isLoading ? styles.btnDisabled : styles.btnSecondary}`}
                            >
                                <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                <span>Reset</span>
                            </button>
                        </div>
                    </form>

                    {/* Results */}
                    {response && (
                        <section className="mt-10 pt-8 border-t border-gray-800/80" aria-label="Analysis results">
                            <header className="flex items-center gap-3 mb-5">
                                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" />
                                <h2 className="text-xl font-bold text-gray-100 tracking-tight">Analysis Result</h2>
                            </header>
                            <pre className="bg-gray-950/60 border border-gray-800/80 rounded-2xl p-6 overflow-x-auto ring-1 ring-white/5 text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
                                {JSON.stringify(response, null, 2)}
                            </pre>
                        </section>
                    )}
                </main>

                {/* Footer */}
                <footer className="text-center mt-8">
                    <p className="text-gray-500 text-sm font-medium">
                        Supported format: <span className="text-gray-400">MP3</span> (max 10MB)
                    </p>
                </footer>
            </div>
        </div>
    );
}

// Sub-component: File Preview
function FilePreview({ file, onClear }) {
    return (
        <div className="flex items-center justify-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center ring-1 ring-emerald-500/30">
                <Icon
                    path="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    className="w-7 h-7 text-emerald-400"
                />
            </div>
            <div className="text-left min-w-0 flex-1">
                <p className="text-base font-medium text-gray-100 truncate">{file.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{formatFileSize(file.size)}</p>
            </div>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                }}
                className="flex-shrink-0 p-2.5 rounded-xl bg-gray-800/60 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                aria-label="Remove file"
            >
                <Icon path="M6 18L18 6M6 6l12 12" />
            </button>
        </div>
    );
}

// Sub-component: Empty Dropzone
function DropzoneEmpty() {
    return (
        <div className="py-2">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/80 flex items-center justify-center mx-auto mb-5 ring-1 ring-gray-700/50 group-hover:ring-gray-600 group-hover:bg-gray-700/60 transition-all duration-300">
                <Icon
                    path="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    className="w-8 h-8 text-gray-400 group-hover:text-gray-300 transition-colors"
                />
            </div>
            <p className="text-gray-200 text-base font-medium">Drag & drop your MP3 file here</p>
            <p className="text-gray-500 text-sm mt-2">
                or <span className="text-violet-400 group-hover:text-violet-300 transition-colors">click to browse</span>
            </p>
            <p className="text-gray-600 text-xs mt-3">Maximum file size: 10MB</p>
        </div>
    );
}
