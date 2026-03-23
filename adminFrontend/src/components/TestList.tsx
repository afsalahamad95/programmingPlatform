import { useState } from 'react';
import { Calendar, Clock, Users, ArrowLeft, InboxIcon, Archive } from 'lucide-react';
import { Test } from '../types';

interface TestListProps {
  tests: Test[];
  onViewTest: (test: Test) => void;
  onBack: () => void;
}

export default function TestList({ tests, onViewTest, onBack }: TestListProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const getTestStatus = (test: Test) => {
    const now = new Date();
    if (now < new Date(test.startTime)) return 'scheduled';
    if (now >= new Date(test.startTime) && now <= new Date(test.endTime)) return 'in-progress';
    return 'completed';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const now = new Date();
  const activeTests = tests.filter(test => new Date(test.endTime) >= now);
  const archivedTests = tests.filter(test => new Date(test.endTime) < now);
  const displayTests = activeTab === 'active' ? activeTests : archivedTests;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Calendar className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Test Management
            </h2>
          </div>
          
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg border transition-colors ${
                activeTab === 'active' 
                ? 'bg-indigo-600 text-white border-indigo-600 z-10' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Active / Scheduled
                <span className={`ml-1.5 py-0.5 px-2 rounded-full text-xs ${activeTab === 'active' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {activeTests.length}
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r transition-colors ${
                activeTab === 'archived' 
                ? 'bg-indigo-600 text-white border-indigo-600 z-10' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Archived
                <span className={`ml-1.5 py-0.5 px-2 rounded-full text-xs ${activeTab === 'archived' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {archivedTests.length}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {displayTests.length === 0 ? (
        <div className="p-12 text-center">
          {activeTab === 'archived' ? (
            <Archive className="mx-auto h-12 w-12 text-gray-300" />
          ) : (
            <InboxIcon className="mx-auto h-12 w-12 text-gray-300" />
          )}
          <h3 className="mt-4 text-sm font-medium text-gray-900">
            {activeTab === 'active' ? 'No active tests' : 'No archived tests'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'active' 
              ? 'Get started by scheduling a new test.' 
              : 'Expired tests will automatically appear here.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {displayTests.map((test) => {
            const status = activeTab === 'archived' ? 'archived' : getTestStatus(test);
            const statusColors = {
              scheduled: 'bg-yellow-100 text-yellow-800',
              'in-progress': 'bg-green-100 text-green-800',
              completed: 'bg-gray-100 text-gray-800',
              archived: 'bg-gray-200 text-gray-600 border border-gray-300',
            };

            return (
              <div
                key={test.id}
                className={`p-6 transition-colors cursor-pointer ${activeTab === 'archived' ? 'hover:bg-gray-100 opacity-80' : 'hover:bg-gray-50'}`}
                onClick={() => onViewTest(test)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      {test.title}
                      {activeTab === 'archived' && (
                        <span className="text-xs font-normal text-gray-500 flex items-center"><Archive className="w-3 h-3 mr-1" /> Archived</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {test.description}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{activeTab === 'archived' ? 'Ended' : 'Start'}: {formatDate(activeTab === 'archived' ? test.endTime : test.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Duration: {test.duration} mins</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {/* Handle null or undefined safely */}
                    <span>{test.questions?.length ?? 0} Questions</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
