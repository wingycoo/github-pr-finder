import { useState, useEffect, useMemo } from "react";
import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { parseDiff, Diff, Hunk } from "react-diff-view";
import "react-diff-view/style/index.css";
import "github-markdown-css/github-markdown-light.css";
import { DATA_KEY } from "../constants";
import { getSetting } from "../utils/database";

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
      const selectedElement = document.querySelector(`[data-pr-id="${selectedPR.id}"]`);
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
    <div className="flex flex-col h-screen bg-base-100">
      <div className="bg-base-200 p-4 shadow-md">
        <div className="flex flex-wrap items-center gap-4">
          <div className="form-control w-full max-w-xs">
            <select
              id="member-select"
              className="select select-bordered w-full"
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

          <div className="form-control w-full max-w-xs">
            <select
              id="year-select"
              className="select select-bordered w-full"
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

          <div className="form-control w-full max-w-xs">
            <select
              id="quarter-select"
              className="select select-bordered w-full"
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

          <div className="badge badge-lg badge-primary">
            총 {pullRequests.length}개의 PR
          </div>
        </div>
      </div>

      <div className={`flex-1 grid ${showBody && showDiff ? 'grid-cols-3' : showBody || showDiff ? 'grid-cols-2' : 'grid-cols-1'} gap-2 p-2 overflow-hidden`}>
        {/* PR 목록 */}
        <div className="flex flex-col bg-base-200 rounded-lg shadow-md overflow-hidden">
          <h3 className="text-lg font-bold p-3 bg-base-300">Pull Requests</h3>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {pullRequests.length === 0 ? (
              <div className="flex items-center justify-center h-full text-base-content/60 text-center p-4">
                {selectedMember && selectedYear && selectedQuarter
                  ? "조회된 PR이 없습니다."
                  : "멤버, 연도, 분기를 선택해주세요."}
              </div>
            ) : (
              pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  data-pr-id={pr.id}
                  className={`card bg-base-100 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    selectedPR?.id === pr.id ? "ring-2 ring-primary bg-primary/10" : ""
                  }`}
                  onClick={() => setSelectedPR(pr)}
                >
                  <div className="card-body p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="badge badge-sm text-white"
                        style={{ backgroundColor: getStateColor(pr.state) }}
                      >
                        {pr.state}
                      </span>
                      <span className="text-sm font-mono text-base-content/70">#{pr.pr_number}</span>
                    </div>
                    <div className="font-medium text-sm line-clamp-2">{pr.title}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-base-content/60">
                      <span className="truncate max-w-[200px]">
                        {repositories.get(pr.repository_id)?.owner}/
                        {repositories.get(pr.repository_id)?.name}
                      </span>
                      <span>{formatDate(pr.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PR 본문 */}
        {showBody && (
          <div className="flex flex-col bg-base-200 rounded-lg shadow-md overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-base-300">
              <h3 className="text-lg font-bold">본문</h3>
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => setShowBody(false)}
                title="본문 숨기기 (C)"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
            {selectedPR ? (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-bold mb-2">{selectedPR.title}</h2>
                  <div className="flex items-center">
                    <a
                      href={selectedPR.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm"
                    >
                      GitHub에서 보기 →
                    </a>
                  </div>
                </div>
                <div className="prose max-w-none markdown-body">
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
                                className="link link-primary"
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
                    <p className="text-base-content/60">설명이 없습니다.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/60">PR을 선택해주세요.</div>
            )}
            </div>
          </div>
        )}

        {/* Code Diff */}
        {showDiff && (
          <div className="flex flex-col bg-base-200 rounded-lg shadow-md overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-base-300">
              <h3 className="text-lg font-bold">Code Diff</h3>
              <button
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => setShowDiff(false)}
                title="Code Diff 숨기기 (D)"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
            {selectedPR ? (
              parsedDiff.length > 0 ? (
                <div className="space-y-4">
                  {parsedDiff.map((file, index) => (
                    <div key={index} className="border border-base-300 rounded-lg overflow-hidden">
                      <div className="bg-base-300 px-3 py-2 font-mono text-sm font-semibold">
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
                <div className="flex flex-col items-center justify-center h-full text-base-content/60 text-center gap-2">
                  <div>Diff를 불러올 수 없습니다.</div>
                  <a
                    href={selectedPR.html_url + "/files"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary"
                  >
                    GitHub에서 보기 →
                  </a>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/60">PR을 선택해주세요.</div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* 숨김 토글 버튼 */}
      <div className="fixed bottom-4 right-4 flex gap-2">
        {!showBody && (
          <button
            className="btn btn-primary btn-sm shadow-lg"
            onClick={() => setShowBody(true)}
            title="본문 보이기 (C)"
          >
            본문 (C)
          </button>
        )}
        {!showDiff && (
          <button
            className="btn btn-primary btn-sm shadow-lg"
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
