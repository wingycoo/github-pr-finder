import { useState } from "react";
import RepositorySettings from "./RepositorySettings";
import TokenSettings from "./TokenSettings";
import MemberSettings from "./MemberSettings";
import "./Settings.css";

interface SettingsProps {
  onClose: () => void;
}

type TabType = "repositories" | "token" | "members";

const Settings = ({ onClose }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("repositories");

  const renderContent = () => {
    switch (activeTab) {
      case "repositories":
        return <RepositorySettings />;
      case "token":
        return <TokenSettings />;
      case "members":
        return <MemberSettings />;
      default:
        return <RepositorySettings />;
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>설정</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-sidebar">
            <nav className="settings-nav">
              <button
                className={`nav-item ${activeTab === "repositories" ? "active" : ""}`}
                onClick={() => setActiveTab("repositories")}
              >
                Repository 관리
              </button>
              <button
                className={`nav-item ${activeTab === "token" ? "active" : ""}`}
                onClick={() => setActiveTab("token")}
              >
                GitHub Access Token
              </button>
              <button
                className={`nav-item ${activeTab === "members" ? "active" : ""}`}
                onClick={() => setActiveTab("members")}
              >
                Member 관리
              </button>
            </nav>
          </div>

          <div className="settings-main">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;