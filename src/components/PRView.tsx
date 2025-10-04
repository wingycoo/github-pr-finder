import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import "github-markdown-css/github-markdown-light.css";
import "./PRView.css";

interface Member {
  id: number;
  username: string;
  display_name: string | null;
}

interface PullRequest {
  id: number;
  pr_number: number;
  title: string;
  body: string | null;
  author: string;
  repository_id: number;
  state: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  html_url: string;
  diff_url: string;
}

interface Repository {
  id: number;
  name: string;
  owner: string;
}

const PRView = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [repositories, setRepositories] = useState<Map<number, Repository>>(new Map());

  useEffect(() => {
    loadMembers();
    loadRepositories();
    // 기본값으로 현재 월 설정
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(currentMonth);
  }, []);

  useEffect(() => {
    if (selectedMember && selectedMonth) {
      loadPullRequests();
    }
  }, [selectedMember, selectedMonth]);

  const loadMembers = async () => {
    try {
      const db = await Database.load("sqlite:github_pr_finder.db");
      const result = await db.select<Member[]>("SELECT * FROM members");
      setMembers(result);
    } catch (error) {
      console.error("멤버 목록 로딩 실패:", error);
    }
  };

  const loadRepositories = async () => {
    try {
      const db = await Database.load("sqlite:github_pr_finder.db");
      const result = await db.select<Repository[]>("SELECT * FROM repositories");
      const repoMap = new Map<number, Repository>();
      result.forEach(repo => repoMap.set(repo.id, repo));
      setRepositories(repoMap);
    } catch (error) {
      console.error("저장소 목록 로딩 실패:", error);
    }
  };

  const loadPullRequests = async () => {
    try {
      const db = await Database.load("sqlite:github_pr_finder.db");

      // 선택한 월의 시작일과 종료일 계산
      const [year, month] = selectedMonth.split("-");
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDateStr = `${year}-${month}-${endDate}`;

      const result = await db.select<PullRequest[]>(
        `SELECT * FROM pull_requests
         WHERE author = '${selectedMember}'
         AND date(created_at) >= '${startDate}'
         AND date(created_at) <= '${endDateStr}'
         ORDER BY created_at DESC`
      );

      setPullRequests(result);
      setSelectedPR(null);
    } catch (error) {
      console.error("PR 목록 로딩 실패:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case "open":
        return "#238636";
      case "closed":
        return "#da3633";
      case "merged":
        return "#8957e5";
      default:
        return "#6e7781";
    }
  };

  return (
    <div className="pr-view-container">
      <div className="pr-view-header">
        <div className="filter-section">
          <div className="filter-group">
            <label htmlFor="member-select">멤버</label>
            <select
              id="member-select"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              <option value="">멤버를 선택하세요</option>
              {members.map((member) => (
                <option key={member.id} value={member.username}>
                  {member.display_name || member.username}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="month-select">조회 월</label>
            <input
              id="month-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

          <div className="pr-count">
            총 {pullRequests.length}개의 PR
          </div>
        </div>
      </div>

      <div className="pr-view-content">
        {/* PR 목록 */}
        <div className="pr-list-panel">
          <h3>Pull Requests</h3>
          <div className="pr-list">
            {pullRequests.length === 0 ? (
              <div className="empty-state">
                {selectedMember && selectedMonth
                  ? "조회된 PR이 없습니다."
                  : "멤버와 월을 선택해주세요."}
              </div>
            ) : (
              pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  className={`pr-item ${selectedPR?.id === pr.id ? "selected" : ""}`}
                  onClick={() => setSelectedPR(pr)}
                >
                  <div className="pr-item-header">
                    <span
                      className="pr-state"
                      style={{ backgroundColor: getStateColor(pr.state) }}
                    >
                      {pr.state}
                    </span>
                    <span className="pr-number">#{pr.pr_number}</span>
                  </div>
                  <div className="pr-item-title">{pr.title}</div>
                  <div className="pr-item-meta">
                    <span className="pr-repo">
                      {repositories.get(pr.repository_id)?.owner}/
                      {repositories.get(pr.repository_id)?.name}
                    </span>
                    <span className="pr-date">{formatDate(pr.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PR 본문 */}
        <div className="pr-body-panel">
          <h3>본문</h3>
          <div className="pr-body-content">
            {selectedPR ? (
              <>
                <div className="pr-body-header">
                  <h2>{selectedPR.title}</h2>
                  <div className="pr-body-meta">
                    <a
                      href={selectedPR.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pr-link"
                    >
                      GitHub에서 보기 →
                    </a>
                  </div>
                </div>
                <div className="pr-body-markdown markdown-body">
                  {selectedPR.body ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        img: ({ node, ...props }) => (
                          <img
                            {...props}
                            style={{ maxWidth: "100%", height: "auto" }}
                            loading="lazy"
                          />
                        ),
                      }}
                    >
                      {selectedPR.body}
                    </ReactMarkdown>
                  ) : (
                    <p className="no-description">설명이 없습니다.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">PR을 선택해주세요.</div>
            )}
          </div>
        </div>

        {/* Code Diff */}
        <div className="pr-diff-panel">
          <h3>Code Diff</h3>
          <div className="pr-diff-content">
            {selectedPR ? (
              <iframe
                src={selectedPR.html_url + "/files"}
                title="PR Diff"
                className="pr-diff-iframe"
              />
            ) : (
              <div className="empty-state">PR을 선택해주세요.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PRView;
