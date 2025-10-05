import { useState, useEffect, useMemo } from "react";
import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { getSetting } from "../utils/database";
import { DATA_KEY } from "../constants";
import { parseDiff, Diff, Hunk } from "react-diff-view";
import "react-diff-view/style/index.css";
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
  diff_content: string | null;
}

interface Repository {
  id: number;
  name: string;
  owner: string;
}

const PRView = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("");
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [repositories, setRepositories] = useState<Map<number, Repository>>(new Map());
  const [githubToken, setGithubToken] = useState<string>("");
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map());
  const [diffText, setDiffText] = useState<string>("");
  const [showBody, setShowBody] = useState<boolean>(true);
  const [showDiff, setShowDiff] = useState<boolean>(true);

  useEffect(() => {
    loadMembers();
    loadRepositories();
    loadGithubToken();
    // 기본값으로 현재 연도와 분기 설정
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3).toString();
    setSelectedYear(currentYear);
    setSelectedQuarter(currentQuarter);
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // input, textarea에서는 단축키 비활성화
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        setShowBody(prev => !prev);
      } else if (e.key === 'd' || e.key === 'D') {
        setShowDiff(prev => !prev);
      } else if (e.key === 'n' || e.key === 'N') {
        // 다음 PR로 이동
        if (pullRequests.length === 0) return;

        const currentIndex = selectedPR
          ? pullRequests.findIndex(pr => pr.id === selectedPR.id)
          : -1;

        const nextIndex = currentIndex + 1;
        if (nextIndex < pullRequests.length) {
          setSelectedPR(pullRequests[nextIndex]);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        // 이전 PR로 이동
        if (pullRequests.length === 0) return;

        const currentIndex = selectedPR
          ? pullRequests.findIndex(pr => pr.id === selectedPR.id)
          : -1;

        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          setSelectedPR(pullRequests[prevIndex]);
        } else if (currentIndex === -1 && pullRequests.length > 0) {
          // 선택된 PR이 없으면 첫 번째 PR 선택
          setSelectedPR(pullRequests[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pullRequests, selectedPR]);

  useEffect(() => {
    if (selectedMember && selectedYear && selectedQuarter) {
      loadPullRequests();
    }
  }, [selectedMember, selectedYear, selectedQuarter]);

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

  const loadGithubToken = async () => {
    try {
      const token = await getSetting(DATA_KEY.GITHUB_ACCESS_TOKEN);
      if (token) {
        setGithubToken(token);
      }
    } catch (error) {
      console.error("토큰 로딩 실패:", error);
    }
  };

  const loadPullRequests = async () => {
    try {
      const db = await Database.load("sqlite:github_pr_finder.db");

      // 선택한 분기의 시작일과 종료일 계산
      const year = selectedYear;
      const quarter = parseInt(selectedQuarter);
      const startMonth = (quarter - 1) * 3 + 1;
      const endMonth = quarter * 3;

      const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
      const endDate = new Date(parseInt(year), endMonth, 0).getDate();
      const endDateStr = `${year}-${String(endMonth).padStart(2, "0")}-${endDate}`;

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

  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    if (imageCache.has(url)) {
      return imageCache.get(url)!;
    }

    try {
      const bytes: number[] = await invoke("fetch_github_image", { url, token: githubToken });
      const base64 = btoa(String.fromCharCode(...bytes));
      const dataUrl = `data:image/png;base64,${base64}`;
      setImageCache(new Map(imageCache.set(url, dataUrl)));
      return dataUrl;
    } catch (error) {
      console.error("이미지 로딩 실패:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (selectedPR) {
      setDiffText(selectedPR.diff_content || "");

      // 선택된 PR을 화면에 보이도록 스크롤
      const selectedElement = document.querySelector('.pr-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    } else {
      setDiffText("");
    }
  }, [selectedPR]);

  const parsedDiff = useMemo(() => {
    if (!diffText) return [];
    try {
      return parseDiff(diffText);
    } catch (error) {
      console.error("Diff 파싱 실패:", error);
      return [];
    }
  }, [diffText]);

  return (
    <div className="pr-view-container">
      <div className="pr-view-header">
        <div className="filter-section">
          <div className="filter-group">
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
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">연도를 선택하세요</option>
              <option value="2021">2021</option>
              <option value="2022">2022</option>
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              id="quarter-select"
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
            >
              <option value="">분기를 선택하세요</option>
              <option value="1">1분기 (1-3월)</option>
              <option value="2">2분기 (4-6월)</option>
              <option value="3">3분기 (7-9월)</option>
              <option value="4">4분기 (10-12월)</option>
            </select>
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
                {selectedMember && selectedYear && selectedQuarter
                  ? "조회된 PR이 없습니다."
                  : "멤버, 연도, 분기를 선택해주세요."}
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
        {showBody && (
          <div className="pr-body-panel">
            <div className="panel-header">
              <h3>본문</h3>
              <button
                className="toggle-button"
                onClick={() => setShowBody(false)}
                title="본문 숨기기 (C)"
              >
                ✕
              </button>
            </div>
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
                        img: ({ node, ...props }) => {
                          const [imgSrc, setImgSrc] = useState<string>(props.src || "");
                          const [isLoading, setIsLoading] = useState<boolean>(true);
                          const [hasError, setHasError] = useState<boolean>(false);

                          useEffect(() => {
                            if (props.src && props.src.includes("github.com")) {
                              setIsLoading(true);
                              fetchImageAsBase64(props.src)
                                .then(base64Url => {
                                  setImgSrc(base64Url);
                                  setIsLoading(false);
                                })
                                .catch(() => {
                                  setHasError(true);
                                  setIsLoading(false);
                                });
                            } else {
                              setIsLoading(false);
                            }
                          }, [props.src]);

                          if (hasError) {
                            return (
                              <a
                                href={props.src}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#0969da", textDecoration: "underline" }}
                              >
                                🖼️ 이미지 보기: {props.alt || "GitHub 이미지"}
                              </a>
                            );
                          }

                          return (
                            <img
                              {...props}
                              src={imgSrc}
                              style={{ maxWidth: "100%", height: "auto", opacity: isLoading ? 0.5 : 1 }}
                              loading="lazy"
                            />
                          );
                        },
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
        )}

        {/* Code Diff */}
        {showDiff && (
          <div className="pr-diff-panel">
            <div className="panel-header">
              <h3>Code Diff</h3>
              <button
                className="toggle-button"
                onClick={() => setShowDiff(false)}
                title="Code Diff 숨기기 (D)"
              >
                ✕
              </button>
            </div>
            <div className="pr-diff-content">
            {selectedPR ? (
              parsedDiff.length > 0 ? (
                <div className="diff-viewer">
                  {parsedDiff.map((file, index) => (
                    <div key={index} className="diff-file">
                      <div className="diff-file-header">
                        {file.oldPath === file.newPath
                          ? file.oldPath
                          : `${file.oldPath} → ${file.newPath}`}
                      </div>
                      <Diff
                        key={file.oldRevision + "-" + file.newRevision}
                        viewType="split"
                        diffType={file.type}
                        hunks={file.hunks || []}
                      >
                        {(hunks) =>
                          hunks.map((hunk) => (
                            <Hunk key={hunk.content} hunk={hunk} />
                          ))
                        }
                      </Diff>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  Diff를 불러올 수 없습니다.
                  <br />
                  <a
                    href={selectedPR.html_url + "/files"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0969da", textDecoration: "underline" }}
                  >
                    GitHub에서 보기 →
                  </a>
                </div>
              )
            ) : (
              <div className="empty-state">PR을 선택해주세요.</div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* 숨김 토글 버튼 */}
      <div className="hidden-panel-toggles">
        {!showBody && (
          <button
            className="show-panel-button"
            onClick={() => setShowBody(true)}
            title="본문 보이기 (C)"
          >
            본문 (C)
          </button>
        )}
        {!showDiff && (
          <button
            className="show-panel-button"
            onClick={() => setShowDiff(true)}
            title="Code Diff 보이기 (D)"
          >
            Code Diff (D)
          </button>
        )}
      </div>
    </div>
  );
};

export default PRView;
