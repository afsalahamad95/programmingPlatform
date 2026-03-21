import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateRoadmap } from '../api/ai';
import { Map, Loader2, Target } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const STUDENT_ID = "65f0123456789abcdef12345";

export default function CareerRoadmap() {
  const [roadmap, setRoadmap] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const markdown = await generateRoadmap(STUDENT_ID, targetRole);
      setRoadmap(markdown);
    } catch (err) {
      console.error(err);
      setError("Failed to generate career roadmap. Ensure the LLM server is accessible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Career Roadmap</h1>
          <p className="text-gray-300 mt-1">Get an AI-tailored learning path to reach your dream role.</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-grow w-full">
            <label htmlFor="targetRole" className="block text-sm font-medium text-gray-300 mb-2">
              Dream Role
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Target className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="targetRole"
                id="targetRole"
                className="glass-input block w-full pl-10 pr-3 py-2 sm:text-sm"
                placeholder="e.g. Senior Machine Learning Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading || !targetRole.trim()}
            icon={loading ? Loader2 : Map}
            className={loading ? 'animate-pulse whitespace-nowrap' : 'whitespace-nowrap'}
          >
            {loading ? 'Generating...' : 'Map My Journey'}
          </Button>
        </form>
      </Card>

      {error && (
        <Card className="border-red-500/50 bg-red-900/20">
          <p className="text-red-400 font-medium">{error}</p>
        </Card>
      )}

      {roadmap ? (
        <Card className="overflow-x-auto">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{roadmap}</ReactMarkdown>
          </div>
        </Card>
      ) : (
        !loading && !error && (
          <Card className="text-center py-24">
            <Map className="mx-auto h-16 w-16 text-gray-500 mb-4" />
            <h3 className="text-xl font-medium text-gray-300">Where to next?</h3>
            <p className="text-gray-400 mt-2 max-w-md mx-auto">
              Enter a job title above and unleash the AI to calculate the exact skills, 
              projects, and certifications you need to conquer your industry.
            </p>
          </Card>
        )
      )}
    </div>
  );
}
