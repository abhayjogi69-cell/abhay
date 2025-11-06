
import React, { useState, useCallback, useRef } from 'react';
import { editImage } from '../services/geminiService';
import { 
    UploadIcon, 
    SparklesIcon, 
    ErrorIcon,
    SunIcon,
    MoonIcon,
    ClockIcon,
    LightBulbIcon,
    FilmIcon,
    LightningBoltIcon,
    ImageIcon,
    SubjectIcon,
    BackgroundIcon
} from './IconComponents';

type ImageState = {
  file: File | null;
  previewUrl: string | null;
};

const predefinedStyles = [
  { name: 'Vintage', prompt: 'Apply a vintage photo filter, with faded colors and a slightly grainy texture.' },
  { name: 'Black and White', prompt: 'Convert the image to a dramatic black and white photograph.' },
  { name: 'Cartoonish', prompt: 'Transform the image into a cartoon or comic book style.' },
  { name: 'Futuristic', prompt: 'Give the image a futuristic, cyberpunk aesthetic with neon lights.' },
];

const lightingTools = [
    { name: 'Brighter', prompt: 'increase the brightness, make the image lighter', icon: SunIcon },
    { name: 'Darker', prompt: 'decrease the brightness, make the image darker', icon: MoonIcon },
    { name: 'Golden Hour', prompt: 'change lighting to golden hour, with warm, soft light', icon: ClockIcon },
    { name: 'Studio', prompt: 'relight with professional studio lighting', icon: LightBulbIcon },
    { name: 'Cinematic', prompt: 'apply cinematic lighting, moody and atmospheric', icon: FilmIcon },
    { name: 'Dramatic', prompt: 'add dramatic, high-contrast lighting', icon: LightningBoltIcon },
];

// --- Sub-components ---

interface UploaderProps {
  onImageSelect: (file: File) => void;
  imagePreviewUrl: string | null;
  label?: string;
}
const Uploader: React.FC<UploaderProps> = ({ onImageSelect, imagePreviewUrl, label = "Click or drag & drop to upload" }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageSelect(event.target.files[0]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      onImageSelect(event.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="relative w-full h-64 border-2 border-dashed border-slate-600 rounded-lg flex flex-col justify-center items-center text-slate-400 hover:border-purple-500 hover:text-purple-400 transition-all duration-300 cursor-pointer bg-slate-800/50"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {imagePreviewUrl ? (
        <img src={imagePreviewUrl} alt="Original preview" className="absolute inset-0 w-full h-full object-cover rounded-lg" />
      ) : (
        <>
          <UploadIcon className="w-12 h-12 mb-2" />
          <p className="font-semibold">{label}</p>
          <p className="text-sm">PNG, JPG, WEBP, etc.</p>
        </>
      )}
    </div>
  );
};

interface ImageResultProps {
    editedImageUrl: string | null;
    isLoading: boolean;
}
const ImageResult: React.FC<ImageResultProps> = ({ editedImageUrl, isLoading }) => {
    return (
        <div className="relative w-full h-64 sm:h-auto sm:aspect-square bg-slate-800/50 rounded-lg flex justify-center items-center border border-slate-700">
             <div className="absolute inset-0 flex justify-center items-center text-slate-500 z-0">
                <SparklesIcon className="w-16 h-16 opacity-10" />
                <p className="absolute">Edited Image</p>
            </div>
            {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center rounded-lg z-20">
                    <div className="w-12 h-12 border-4 border-t-purple-400 border-slate-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-300">Generating...</p>
                </div>
            )}
            {editedImageUrl && (
                <img src={`data:image/png;base64,${editedImageUrl}`} alt="Edited result" className="relative w-full h-full object-contain rounded-lg z-10"/>
            )}
        </div>
    );
};

interface FocusButtonProps {
    label: string;
    icon: React.FC<{ className?: string }>;
    isActive: boolean;
    onClick: () => void;
    disabled: boolean;
}
const FocusButton: React.FC<FocusButtonProps> = ({ label, icon: Icon, isActive, onClick, disabled }) => {
    const baseClasses = "flex flex-col items-center justify-center text-center gap-1.5 p-3 border rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800";
    const activeClasses = "bg-purple-600/30 border-purple-500 text-white focus:ring-purple-500";
    const inactiveClasses = "bg-slate-700/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500 focus:ring-purple-500";
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
            aria-pressed={isActive}
        >
            <Icon className="w-6 h-6" />
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
};

const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<ImageState>({ file: null, previewUrl: null });
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<'image' | 'subject' | 'background'>('image');


  const handleImageSelect = useCallback((file: File) => {
    setOriginalImage({ file, previewUrl: URL.createObjectURL(file) });
    setEditedImage(null); // Clear previous result on new image upload
    setError(null);
  }, []);

  const handleGenerateClick = async () => {
    if (!originalImage.file || !prompt.trim()) {
      setError('Please upload an image and enter a prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    let finalPrompt = prompt;
    if (editTarget === 'subject') {
        finalPrompt = `For the main subject(s): ${prompt}`;
    } else if (editTarget === 'background') {
        finalPrompt = `For the background: ${prompt}`;
    }

    try {
      const resultBase64 = await editImage(originalImage.file, finalPrompt);
      setEditedImage(resultBase64);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStyleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPrompt(event.target.value);
  };

  const handleLightingClick = (lightingPrompt: string) => {
    setPrompt(prev => {
        if (!prev.trim()) return lightingPrompt;
        if (prev.endsWith(',')) return `${prev} ${lightingPrompt}`;
        return `${prev.trim()}, ${lightingPrompt}`;
    });
  };

  const isButtonDisabled = isLoading || !originalImage.file || !prompt.trim();

  const placeholderText = {
      image: 'e.g., "Add a retro filter", "Make it watercolor"',
      subject: 'e.g., "Change their shirt to red", "Add sunglasses"',
      background: 'e.g., "Change background to a beach", "Blur background"',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Control Panel */}
        <div className="flex flex-col gap-6 p-6 bg-slate-800 rounded-xl border border-slate-700">
            <div>
                <label className="block text-lg font-semibold mb-2 text-slate-300">1. Upload your image</label>
                <Uploader onImageSelect={handleImageSelect} imagePreviewUrl={originalImage.previewUrl} />
            </div>
            <div>
                <label htmlFor="prompt-input" className="block text-lg font-semibold text-slate-300 mb-2">2. Describe your edit</label>
                <textarea
                    id="prompt-input"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={placeholderText[editTarget]}
                    className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 resize-none h-28"
                    disabled={!originalImage.file}
                />
            </div>
            <div>
                <label className="block text-lg font-semibold mb-3 text-slate-300">3. Select editing focus</label>
                <div className="grid grid-cols-3 gap-3">
                    <FocusButton
                        label="Entire Image"
                        icon={ImageIcon}
                        isActive={editTarget === 'image'}
                        onClick={() => setEditTarget('image')}
                        disabled={!originalImage.file}
                    />
                    <FocusButton
                        label="Subject"
                        icon={SubjectIcon}
                        isActive={editTarget === 'subject'}
                        onClick={() => setEditTarget('subject')}
                        disabled={!originalImage.file}
                    />
                    <FocusButton
                        label="Background"
                        icon={BackgroundIcon}
                        isActive={editTarget === 'background'}
                        onClick={() => setEditTarget('background')}
                        disabled={!originalImage.file}
                    />
                </div>
            </div>
            <div className="flex flex-col gap-4">
                <div className="flex items-center">
                    <div className="flex-grow border-t border-slate-600"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-sm">OR USE TOOLS</span>
                    <div className="flex-grow border-t border-slate-600"></div>
                </div>
                <div className="space-y-4">
                    <select
                        id="style-select"
                        value={''} // Reset select visually after selection
                        onChange={handleStyleChange}
                        disabled={!originalImage.file}
                        aria-label="Choose a predefined editing style"
                        className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
                    >
                        <option value="" disabled>Select a style preset...</option>
                        {predefinedStyles.map((style) => (
                            <option key={style.name} value={style.prompt}>
                                {style.name}
                            </option>
                        ))}
                    </select>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-400 mb-2 text-center">Quick Lighting Adjustments</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {lightingTools.map((tool) => (
                                <button
                                    key={tool.name}
                                    onClick={() => handleLightingClick(tool.prompt)}
                                    disabled={!originalImage.file}
                                    className="flex flex-col items-center justify-center text-center gap-1.5 p-2 bg-slate-700/50 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 hover:border-purple-500 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    title={tool.name}
                                >
                                    <tool.icon className="w-5 h-5" />
                                    <span className="text-xs font-medium">{tool.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <button
                onClick={handleGenerateClick}
                disabled={isButtonDisabled}
                className="w-full flex justify-center items-center gap-2 px-6 py-3 font-bold text-white bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg hover:from-purple-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <SparklesIcon className="w-5 h-5" />
                {isLoading ? 'Generating...' : 'Generate'}
            </button>
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg">
                    <ErrorIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}
        </div>

        {/* Results */}
        <div className="p-6 bg-slate-800 rounded-xl border border-slate-700">
            <ImageResult editedImageUrl={editedImage} isLoading={isLoading} />
        </div>
    </div>
  );
};

export default ImageEditor;
