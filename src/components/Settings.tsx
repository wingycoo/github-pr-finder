import { useState } from "react";
import RepositorySettings from "./RepositorySettings";
import TokenSettings from "./TokenSettings";

interface SettingsProps {
  onClose: () => void;
}

type TabType = "repositories" | "token";

const Settings = ({ onClose }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("repositories");

  const renderContent = () => {
    switch (activeTab) {
      case "repositories":
        return <RepositorySettings />;
      case "token":
        return <TokenSettings />;
      default:
        return <RepositorySettings />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-base-100 w-full max-w-4xl h-[80vh] rounded-lg shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-base-300">
          <h2 className="text-2xl font-bold">설정</h2>
          <button
            className="btn btn-ghost btn-circle text-2xl"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 bg-base-200 p-4 border-r border-base-300">
            <nav className="flex flex-col gap-2">
              <button
                className={`btn btn-ghost justify-start ${activeTab === "repositories" ? "btn-active" : ""}`}
                onClick={() => setActiveTab("repositories")}
              >
                Repository 관리
              </button>
              <button
                className={`btn btn-ghost justify-start ${activeTab === "token" ? "btn-active" : ""}`}
                onClick={() => setActiveTab("token")}
              >
                GitHub Access Token
              </button>
            </nav>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;