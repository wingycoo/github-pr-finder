import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import { useEffect, useState } from "react";
import { DATA_KEY } from "../constants";
import { getSetting } from "../utils/database";
import "./SyncData.css";

interface Repository {
  id: number;
  name: string;
  owner: string;
  url: string;
}

const SyncData = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    loadRepositories();
    loadToken();
    console.log("effect");
  }, []);

  const loadRepositories = async () => {
    try {
      const db = await Database.load("sqlite:github_pr_finder.db");
      const result = await db.select<Repository[]>(
        "SELECT * FROM repositories"
      );
      setRepositories(result);
    } catch (error) {
      console.error("저장소 목록 로딩 실패:", error);
    }
  };

  const loadToken = async () => {
    try {
      const token = await getSetting(DATA_KEY.GITHUB_ACCESS_TOKEN);
      if (token) {
        setToken(token);
      }
    } catch (error) {
      console.error("토큰 로딩 실패:", error);
    }
  };

  const handleSync = async () => {
    if (!selectedRepo || !startDate || !endDate) {
      setMessage("모든 필드를 입력해주세요.");
      return;
    }

    if (!token) {
      setMessage("GitHub 토큰을 설정에서 먼저 등록해주세요.");
      return;
    }

    setSyncing(true);
    setMessage("동기화 중...");

    try {
      const [owner, repo] = selectedRepo.split("/");
      const result = await invoke<{ prs: any[]; count: number }>(
        "sync_pull_requests",
        {
          owner,
          repo,
          token,
          startDate: startDate + "T00:00:00Z",
          endDate: endDate + "T23:59:59Z",
        }
      );

      // DB에 저장
      const db = await Database.load("sqlite:github_pr_finder.db");

      // repository_id 조회
      const repoResult = await db.select<{ id: number }[]>(
        `SELECT id FROM repositories WHERE owner = '${owner}' AND name = '${repo}'`
      );

      if (repoResult.length === 0) {
        setMessage(
          `저장소 ${owner}/${repo}를 찾을 수 없습니다. 설정에서 먼저 저장소를 추가해주세요.`
        );
        setSyncing(false);
        return;
      }

      const repositoryId = repoResult[0].id;
      let savedCount = 0;

      // 작성자 목록 수집
      const authors = new Set<string>();
      result.prs.forEach(pr => authors.add(pr.author));

      // 자동으로 멤버 추가
      for (const author of authors) {
        const escapedAuthor = author.replace(/'/g, "''");
        await db.execute(
          `INSERT OR IGNORE INTO members (username, display_name)
           VALUES ('${escapedAuthor}', '${escapedAuthor}')`
        );
      }

      // PR 데이터 저장 (diff 포함)
      for (const pr of result.prs) {
        const body = (pr.body || "").replace(/'/g, "''");
        const title = pr.title.replace(/'/g, "''");
        const author = pr.author.replace(/'/g, "''");
        const mergedAt = pr.merged_at ? `'${pr.merged_at}'` : "NULL";

        // 변경사항 크기 확인 (additions + deletions > 2000 이면 diff 스킵)
        const totalChanges = (pr.additions || 0) + (pr.deletions || 0);
        const shouldFetchDiff = totalChanges <= 2000;

        // Diff 가져오기 (조건부)
        let diffContent = "";
        if (shouldFetchDiff) {
          try {
            diffContent = await invoke<string>("fetch_pr_diff", {
              owner,
              repo,
              prNumber: pr.number,
              token,
            });
          } catch (error) {
            console.error(`PR #${pr.number} Diff 가져오기 실패:`, error);
          }
        } else {
          console.log(
            `PR #${pr.number}: 변경사항이 ${totalChanges}라인으로 2000라인을 초과하여 diff 저장 스킵`
          );
        }

        const escapedDiff = diffContent.replace(/'/g, "''");

        await db.execute(
          `INSERT OR REPLACE INTO pull_requests
          (pr_number, title, body, author, repository_id, state, created_at, updated_at, merged_at, html_url, diff_url, diff_content)
          VALUES (${pr.number}, '${title}', '${body}', '${author}', ${repositoryId}, '${pr.state}', '${pr.created_at}', '${pr.updated_at}', ${mergedAt}, '${pr.html_url}', '${pr.diff_url}', '${escapedDiff}')`
        );
        savedCount++;
        setMessage(`동기화 중... ${savedCount}/${result.prs.length}`);
      }

      setMessage(`동기화 완료: ${savedCount}개의 PR이 저장되었습니다.`);
    } catch (error) {
      setMessage(`동기화 실패: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="sync-container">
      <h2>데이터 동기화</h2>

      <div className="sync-form">
        <div className="form-group">
          <label htmlFor="repository">저장소 선택</label>
          <select
            id="repository"
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            disabled={syncing}
          >
            <option value="">저장소를 선택하세요</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={`${repo.owner}/${repo.name}`}>
                {repo.owner}/{repo.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="start-date">시작 날짜</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => {
              console.log("startDate", e.target.value);
              setStartDate(e.target.value);
            }}
            disabled={syncing}
          />
        </div>

        <div className="form-group">
          <label htmlFor="end-date">종료 날짜</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={syncing}
          />
        </div>

        <button className="sync-button" onClick={handleSync} disabled={syncing}>
          {syncing ? "동기화 중..." : "동기화 시작"}
        </button>

        {message && (
          <div className={`message ${syncing ? "info" : "success"}`}>
            {message}
          </div>
        )}
      </div>

      <div className="sync-info">
        <h3>안내</h3>
        <ul>
          <li>선택한 저장소의 Pull Request를 지정한 기간 동안 동기화합니다.</li>
          <li>동기화 전에 설정에서 GitHub 토큰과 저장소를 등록해주세요.</li>
          <li>대량의 PR이 있는 경우 동기화에 시간이 걸릴 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default SyncData;
