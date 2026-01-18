
import React, { useState, useEffect } from 'react';
import TeacherEditor from './components/TeacherEditor';
import ClassroomView from './components/ClassroomView';
import StudentView from './components/StudentView';
import { LessonData } from './types';

const TEACHER_CODE = "2110";

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'teacher' | 'classroom' | 'student'>('landing');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [activeLesson, setActiveLesson] = useState<LessonData | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/student/')) {
        const id = hash.replace('#/student/', '');
        setStudentId(id);
        setView('student');
      } else if (hash === '#/classroom') {
        setView('classroom');
      } else if (hash === '#/teacher') {
        // Will check passcode
      } else {
        setView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === TEACHER_CODE) {
      window.location.hash = '#/teacher';
      setView('teacher');
    } else {
      setError('错误验证码');
    }
  };

  const loadLessonForClass = (lesson: LessonData) => {
    setActiveLesson(lesson);
    window.location.hash = '#/classroom';
    setView('classroom');
  };

  return (
    <div className="min-h-screen">
      {view === 'landing' && (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-chalkboard-user text-3xl text-blue-600"></i>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">对外汉语教学工具</h1>
              <p className="text-gray-500 mt-2">请登录或进入学生作业页面</p>
            </div>
            
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <input 
                type="password" 
                placeholder="输入教师验证码 (2110)" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                教师登录
              </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-400">学生请点击老师发送的专属链接进入</p>
            </div>
          </div>
        </div>
      )}

      {view === 'teacher' && (
        <TeacherEditor onOpenClassroom={loadLessonForClass} />
      )}

      {view === 'classroom' && (
        <ClassroomView lesson={activeLesson} />
      )}

      {view === 'student' && studentId && (
        <StudentView studentId={studentId} />
      )}
    </div>
  );
};

export default App;
