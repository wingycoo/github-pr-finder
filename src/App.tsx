import { useState } from "react";
import Settings from "./components/Settings";
import SyncData from "./components/SyncData";
import PRView from "./components/PRView";

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
          <div className="hero min-h-screen bg-base-200">
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h2 className="text-5xl font-bold">GitHub Pull Request 조회 도구</h2>
                <p className="py-6">
                  설정을 통해 GitHub 저장소와 멤버를 등록한 후 PR을 조회할 수 있습니다.
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    className="btn btn-primary"
                    onClick={() => setCurrentPage("sync")}
                  >
                    데이터 동기화
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage("view")}
                  >
                    PR 조회
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar bg-base-200 shadow-lg">
        <div className="flex-1 gap-2">
          <button
            className={`btn btn-ghost ${currentPage === "sync" ? "btn-active" : ""}`}
            onClick={() => setCurrentPage("sync")}
          >
            데이터 동기화
          </button>
          <button
            className={`btn btn-ghost ${currentPage === "view" ? "btn-active" : ""}`}
            onClick={() => setCurrentPage("view")}
          >
            PR 조회
          </button>
        </div>
        <div className="flex-none">
          <button
            className="btn btn-ghost btn-circle"
            onClick={() => setShowSettings(true)}
          >
            ⚙️
          </button>
        </div>
      </div>

      <main>
        {renderPage()}
      </main>

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;