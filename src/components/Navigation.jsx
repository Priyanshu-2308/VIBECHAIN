import React from "react";

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "dashboard", label: "DASH", icon: "grid_view" },
    { id: "membership", label: "MEMBERS", icon: "shield_person" },
    { id: "proposals", label: "PROPOSALS", icon: "ballot" },
    { id: "new-allocation", label: "NEW", icon: "add_box" },
    { id: "ledger", label: "LEDGER", icon: "receipt_long" },
  ];

  return (
    <nav className="fixed bottom-0 md:top-16 md:bottom-auto w-full z-40 bg-surface border-t md:border-t-0 md:border-b border-surface-variant">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-5 h-16 w-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] transition-none border-r last:border-r-0 border-surface-variant ${
                  isActive
                    ? "bg-primary text-white"
                    : "bg-surface text-ink hover:text-primary active:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {tab.icon}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider mt-1 font-bold">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

