import React from "react";

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "pot", label: "Pot" },
    { id: "requests", label: "Requests" },
    { id: "new", label: "New Request" },
    { id: "notebook", label: "Notebook" },
  ];

  return (
    <footer className="fixed bottom-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-md border-t border-outline-variant/30 py-3">
      <div className="max-w-[580px] mx-auto px-6">
        <nav className="flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1 px-3 flex flex-col items-center transition-colors font-body text-xs tracking-wider uppercase ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1 transition-all ${
                    isActive ? "bg-secondary-container opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
