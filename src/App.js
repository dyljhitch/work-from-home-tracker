import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

function App() {
  const [records, setRecords] = useState(() => {
    const savedRecords = localStorage.getItem('workRecords');
    return savedRecords ? JSON.parse(savedRecords, (key, value) => {
      if (key === 'clockIn' || key === 'clockOut' || key === 'start' || key === 'end') {
        return value ? new Date(value) : null;
      }
      return value;
    }) : [];
  });
  
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [breakReason, setBreakReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAnimation, setShowAnimation] = useState(false);

  const animationRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('workRecords', JSON.stringify(records));
  }, [records]);

  const clockIn = () => {
    const now = new Date();
    setCurrentSession({
      clockIn: now,
      breaks: [],
      clockOut: null
    });
    setIsClockedIn(true);
  };

  const startBreak = (reason) => {
    if (!isClockedIn) return;
    const now = new Date();
    const finalReason = reason === 'Other' ? customReason || 'Other' : reason;
    setCurrentSession(prev => ({
      ...prev,
      breaks: [...prev.breaks, { start: now, reason: finalReason, end: null }]
    }));
    setBreakReason('');
    setCustomReason('');
  };

  const endBreak = () => {
    if (!isClockedIn) return;
    const now = new Date();
    setCurrentSession(prev => {
      const updatedBreaks = prev.breaks.map(b => 
        b.end ? b : { ...b, end: now }
      );
      return { ...prev, breaks: updatedBreaks };
    });
  };

  const clockOut = () => {
    const now = new Date();
    setCurrentSession(prev => {
      if (!prev) return null;
      const completedSession = { ...prev, clockOut: now };
      setRecords(prevRecords => {
        const isDuplicate = prevRecords.some(r => 
          r.clockIn.getTime() === completedSession.clockIn.getTime() && 
          (!r.clockOut || r.clockOut.getTime() === completedSession.clockOut.getTime())
        );
        if (!isDuplicate) {
          return [...prevRecords, completedSession];
        }
        return prevRecords;
      });
      setShowAnimation(true);
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      animationRef.current = setTimeout(() => {
        setShowAnimation(false);
      }, 3000);
      return null;
    });
    setIsClockedIn(false);
  };

  const exportToExcel = () => {
    const exportData = records.map(record => {
      const breaksFormatted = record.breaks.map(b => 
        `${b.reason}: ${b.start.toLocaleString()} - ${b.end?.toLocaleString() || 'Ongoing'}`
      ).join('; ');
      
      return {
        'Clock In': record.clockIn.toLocaleString(),
        'Clock Out': record.clockOut?.toLocaleString() || 'Not clocked out',
        'Breaks': breaksFormatted,
        'Total Hours': record.clockOut ? 
          ((record.clockOut - record.clockIn) / 3600000).toFixed(2) : 
          'N/A'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Work Records');
    XLSX.writeFile(wb, `Work_Records_${new Date().toLocaleDateString()}.xlsx`);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const clearRecords = () => {
    localStorage.removeItem('workRecords');
    setRecords([]);
  };

  return (
    <div className="App">
      <div className={`main-content ${showAnimation ? 'blurred' : ''}`}>
        <div className="time-display">
          <div className="clock">
            {currentTime.toLocaleTimeString()}
          </div>
          <div className="date-display">
            {formatDate(currentTime)}
          </div>
        </div>

        <h1>Work From Home Tracker</h1>
        
        <div className="controls">
          {!isClockedIn ? (
            <button className="clock-button" onClick={clockIn}>Clock In</button>
          ) : (
            <>
              <div className="break-controls">
                <select 
                  value={breakReason} 
                  onChange={(e) => setBreakReason(e.target.value)}
                >
                  <option value="">Select Break Reason</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Coffee">Coffee</option>
                  <option value="Mental Break">Mental Break</option>
                  <option value="Family Phone Call">Family Phone Call</option>
                  <option value="Work Call">Work Call</option>
                  <option value="Other">Other</option>
                </select>
                
                {breakReason === 'Other' && (
                  <input 
                    type="text" 
                    placeholder="Custom reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  />
                )}
                
                <button 
                  className="clock-button"
                  onClick={() => startBreak(breakReason)}
                  disabled={!breakReason || (breakReason === 'Other' && !customReason)}
                >
                  Start Break
                </button>
                <button className="clock-button" onClick={endBreak}>End Break</button>
              </div>
              <button className="clock-button" onClick={clockOut}>Clock Out</button>
            </>
          )}
        </div>

        <div className="current-session">
          {currentSession && (
            <>
              <h2>Current Session</h2>
              <p>Clocked In: {currentSession.clockIn.toLocaleString()}</p>
              {currentSession.breaks.length > 0 && (
                <div>
                  <h3>Breaks:</h3>
                  {currentSession.breaks.map((b, index) => (
                    <p key={index}>
                      {b.reason}: {b.start.toLocaleString()} - {b.end?.toLocaleString() || 'Ongoing'}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="records">
          <h2>Previous Records</h2>
          {records.map((record, index) => (
            <div key={index} className="record">
              <p>Clock In: {record.clockIn.toLocaleString()}</p>
              <p>Clock Out: {record.clockOut?.toLocaleString()}</p>
              {record.breaks.length > 0 && (
                <p>Breaks: {record.breaks.map(b => 
                  `${b.reason}: ${b.start.toLocaleString()} - ${b.end?.toLocaleString()}`
                ).join(', ')}</p>
              )}
            </div>
          ))}
          {records.length > 0 && (
            <div className="export-controls">
              <button className="clock-button" onClick={exportToExcel}>Export Week to Excel</button>
              <button className="clear-button" onClick={clearRecords}>Clear Records</button>
            </div>
          )}
        </div>
      </div>

      {showAnimation && (
        <div className="mischief-managed-animation">
          <div className="mischief-text">Mischief Managed!</div>
        </div>
      )}

      <footer className="app-footer">
        Created for Karys by Dylan J. Hitch
      </footer>
    </div>
  );
}

export default App;