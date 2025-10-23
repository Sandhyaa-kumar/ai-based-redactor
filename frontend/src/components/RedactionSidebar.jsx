import React from "react";

export default function RedactionSidebar({
  suggestions,
  confirmed,
  onToggle,
  onStartManual,
  manualBoxes,
  setManualBoxes,
  handleRedact,
  loading,
}) {
  return (
    <aside className="w-80 p-6 bg-gray-100 border-r flex flex-col h-full"
      style={{ minHeight: 900 }}>
      <h2 className="font-bold text-lg mb-4">Redactions</h2>
      <div className="flex-1 overflow-y-auto">
        <h3 className="font-semibold mb-2">AI Suggestions</h3>
        <ul>
          {suggestions.map((s, i) => {
            const kept = confirmed.find(
              sg => sg.entity === s.entity && sg.page === s.page && sg.x === s.x
            );
            return (
              <li key={i} className="text-xs flex items-center mb-2">
                <span
                  className={`w-3 h-3 mr-2 rounded-full ${kept ? "bg-blue-400" : "bg-rose-400"}`}/>
                <span className="font-mono bg-gray-200 px-2 py-1 rounded mr-2">{s.entity}</span>
                <span className="bg-gray-300 rounded px-2 py-1 mr-2">{s.type}</span>
                <button
                  className={`px-2 rounded ${kept ? "bg-rose-200" : "bg-teal-200"}`}
                  onClick={() => onToggle(i)}
                >{kept ? "Reject" : "Accept"}</button>
              </li>
            );
          })}
        </ul>
        <h3 className="font-semibold mt-4 mb-2">Manual Redactions</h3>
        <ul>
          {manualBoxes.map((m, i) => (
            <li key={i} className="text-xs flex items-center mb-2">
              <span className="bg-yellow-200 px-2 py-1 rounded mr-2">Manual</span>
              <span className="font-mono bg-gray-100 px-2 py-1 rounded mr-2">{`[${m.x}, ${m.y}, ${m.width}, ${m.height}]`}</span>
              <button
                className="px-2 rounded bg-red-100"
                onClick={() => setManualBoxes(manualBoxes.filter((_, idx) => idx !== i))}
              >Delete</button>
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onStartManual}
        className="mt-2 px-4 py-2 bg-yellow-400 text-xs font-bold rounded"
      >Draw Manual Redaction</button>
      <button
        onClick={handleRedact}
        disabled={loading}
        className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
      >Save & Download</button>
    </aside>
  );
}
