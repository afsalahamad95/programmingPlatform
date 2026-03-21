import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateResume } from '../api/ai';
import { FileText, Loader2, Download } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const STUDENT_ID = "65f0123456789abcdef12345";

export default function ResumeBuilder() {
  const [resume, setResume] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const markdown = await generateResume(STUDENT_ID);
      setResume(markdown);
    } catch (err) {
      console.error(err);
      setError("Failed to generate resume. Ensure the LLM server is accessible.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resume) return;
    const blob = new Blob([resume], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AI_Generated_Resume.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Resume Builder</h1>
          <p className="text-gray-300 mt-1">Generate a professional markdown resume instantly using AI.</p>
        </div>
        <div className="flex gap-4">
          {resume && (
            <Button variant="secondary" onClick={handleDownload} icon={Download}>
              Download MD
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            disabled={loading}
            icon={loading ? Loader2 : FileText}
            className={loading ? 'animate-pulse' : ''}
          >
            {loading ? 'Generating...' : 'Generate Resume'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/50 bg-red-900/20">
          <p className="text-red-400 font-medium">{error}</p>
        </Card>
      )}

      {resume ? (
        <Card className="overflow-x-auto">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{resume}</ReactMarkdown>
          </div>
        </Card>
      ) : (
        !loading && !error && (
          <Card className="text-center py-24">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-300">Ready to build your career?</h3>
            <p className="text-gray-400 mt-2 max-w-md mx-auto">
              Click the generate button above and our AI will analyze your projects, 
              skills, and achievements to build a perfectly formatted markdown resume.
            </p>
          </Card>
        )
      )}
    </div>
  );
}
