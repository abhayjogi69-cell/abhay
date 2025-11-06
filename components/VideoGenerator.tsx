
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateVideo } from '../services/geminiService';
import { UploadIcon, SparklesIcon, ErrorIcon, VideoIcon, KeyIcon } from './IconComponents';

type ImageState = {
  file: File | null;
  previewUrl: string | null;
};

// A reusable uploader component for this feature
const VideoFrameUploader: React.FC<{
  onImageSelect: (file: File) => void;
  imagePreviewUrl: string | null;
  title: string;
}> = ({ onImageSelect, imagePreviewUrl, title }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageSelect(e.dataTransfer.files[0]);
    }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-slate-300">{title}</h3>
        <div
            className="relative w-full h-48 border-2 border-dashed border-slate-600 rounded-lg flex flex-col justify-center items-center text-slate-400 hover:border-purple-500 hover:text-purple-400 transition-all cursor-pointer bg-slate-800/50"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Frame preview" className="absolute inset-0 w-full h-full object-cover rounded-lg" />
            ) : (
                <>
                <UploadIcon className="w-10 h-10 mb-2" />
                <p className="font-semibold text-sm">Upload frame</p>
                </>
            )}
        </div>
    </div>
  );
};

const VideoGenerator: React.FC = () => {
  const [startFrame, setStartFrame] = useState<ImageState>({ file: null, previewUrl: null });
  const [endFrame, setEndFrame] = useState<ImageState>({ file: null, previewUrl: null });
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isKeySelected, setIsKeySelected] = useState<boolean>(false);

  useEffect(() => {
    const checkApiKey = async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setIsKeySelected(hasKey);
        }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        // Assume key selection is successful to avoid race conditions.
        // The API call will fail if it's not, and we can handle that.
        setIsKeySelected(true);
        setError(null);
    }
  };

  const handleGenerateClick = async () => {
    if (!startFrame.file || !endFrame.file || !prompt.trim()) {
      setError('Please provide a start frame, an end frame, and a prompt.');
      return;
    }
    if (!isKeySelected) {
      setError("Please select an API key before generating a video.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl(null);
    setLoadingMessage('Starting video generation...');
    
    try {
      const resultUrl = await generateVideo(startFrame.file, endFrame.file, prompt, setLoadingMessage);
      setGeneratedVideoUrl(resultUrl);
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
      
      if (errorMessage.includes("Requested entity was not found")) {
        setError("API Key error. Please try selecting your API key again.");
        setIsKeySelected(false);
      }

    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const isButtonDisabled = isLoading || !startFrame.file || !endFrame.file || !prompt.trim() || !isKeySelected;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Control Panel */}
        <div className="flex flex-col gap-6 p-6 bg-slate-800 rounded-xl border border-slate-700">
            {!isKeySelected && (
                 <div className="p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg flex flex-col items-center gap-3 text-center">
                    <KeyIcon className="w-8 h-8 text-yellow-300" />
                    <h3 className="font-bold text-yellow-200">API Key Required for Video Generation</h3>
                    <p className="text-sm text-yellow-300">The Veo model requires you to select your own API key. Billing is enabled on this feature.</p>
                    <button 
                        onClick={handleSelectKey}
                        className="px-4 py-2 bg-yellow-600 text-white font-semibold rounded-md hover:bg-yellow-700 transition-colors"
                    >
                        Select API Key
                    </button>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-yellow-400 hover:underline">Learn more about billing</a>
                </div>
            )}
            <div>
                <label className="block text-lg font-semibold mb-3 text-slate-300">1. Upload Frames</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <VideoFrameUploader title="Start Frame" onImageSelect={(file) => setStartFrame({ file, previewUrl: URL.createObjectURL(file) })} imagePreviewUrl={startFrame.previewUrl} />
                    <VideoFrameUploader title="End Frame" onImageSelect={(file) => setEndFrame({ file, previewUrl: URL.createObjectURL(file) })} imagePreviewUrl={endFrame.previewUrl} />
                </div>
            </div>
            <div>
                <label htmlFor="video-prompt-input" className="block text-lg font-semibold text-slate-300 mb-2">2. Describe the video</label>
                <textarea
                    id="video-prompt-input"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={'e.g., "A flower blooming in fast motion"'}
                    className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 resize-none h-28"
                    disabled={!startFrame.file || !endFrame.file}
                />
            </div>
            <button
                onClick={handleGenerateClick}
                disabled={isButtonDisabled}
                className="w-full flex justify-center items-center gap-2 px-6 py-3 font-bold text-white bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg hover:from-purple-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <SparklesIcon className="w-5 h-5" />
                {isLoading ? 'Generating Video...' : 'Generate Video (10s)'}
            </button>
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">
                    <ErrorIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}
        </div>

        {/* Results */}
        <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 flex justify-center items-center">
             <div className="relative w-full aspect-video bg-slate-800/50 rounded-lg flex justify-center items-center border border-slate-700">
                <div className="absolute inset-0 flex justify-center items-center text-slate-500 z-0">
                    <VideoIcon className="w-16 h-16 opacity-10" />
                    <p className="absolute">Generated Video</p>
                </div>
                {isLoading && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center rounded-lg z-20 text-center p-4">
                        <div className="w-12 h-12 border-4 border-t-purple-400 border-slate-600 rounded-full animate-spin"></div>
                        <p className="mt-4 text-slate-200 font-semibold">Generating Video...</p>
                        <p className="mt-2 text-sm text-slate-300">{loadingMessage}</p>
                    </div>
                )}
                {generatedVideoUrl && (
                    <video
                        src={generatedVideoUrl}
                        controls
                        autoPlay
                        loop
                        className="relative w-full h-full object-contain rounded-lg z-10"
                    />
                )}
            </div>
        </div>
    </div>
  );
};

export default VideoGenerator;
