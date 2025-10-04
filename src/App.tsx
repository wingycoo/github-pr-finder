import { useState } from "react";
import Settings from "./components/Settings";
import SyncData from "./components/SyncData";
import PRView from "./components/PRView";
import "./App.css";

type PageType = "home" | "sync" | "view";

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  const [showSettings, setShowSettings] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case "sync":
        return <SyncData />;
      case "view":
        return <PRView />;
      default:
        return (
          <div className="welcome-section">
            <h2>GitHub Pull Request 조회 도구</h2>
            <p>설정을 통해 GitHub 저장소와 멤버를 등록한 후 PR을 조회할 수 있습니다.</p>

            <div className="quick-actions">
              <button
                className="button-primary"
                onClick={() => setCurrentPage("sync")}
              >
                데이터 동기화
              </button>
              <button
                className="button-secondary"
                onClick={() => setCurrentPage("view")}
              >
                PR 조회
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container">
      <header className="app-header">
        <h1 onClick={() => setCurrentPage("home")} style={{ cursor: "pointer" }}>
          GitHub PR Finder
        </h1>
        <nav className="app-nav">
          <button
            className={`nav-button ${currentPage === "sync" ? "active" : ""}`}
            onClick={() => setCurrentPage("sync")}
          >
            데이터 동기화
          </button>
          <button
            className={`nav-button ${currentPage === "view" ? "active" : ""}`}
            onClick={() => setCurrentPage("view")}
          >
            PR 조회
          </button>
          <button
            className="settings-button"
            onClick={() => setShowSettings(true)}
          >
            ⚙️ 설정
          </button>
        </nav>
      </header>

      <main className="main-content">
        {renderPage()}
      </main>

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;