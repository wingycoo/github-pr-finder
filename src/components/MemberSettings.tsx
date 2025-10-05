import { useState, useEffect } from "react";
import { getMembers, addMember, deleteMember, getSetting, Member } from "../utils/database";

const MemberSettings = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [formData, setFormData] = useState({
    username: "",
    display_name: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    user?: any;
    message?: string;
  } | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const memberList = await getMembers();
      setMembers(memberList);
    } catch (error) {
      console.error("멤버 목록 로드 실패:", error);
    }
  };

  const validateGitHubUser = async (username: string) => {
    if (!username.trim()) return;

    setIsValidating(true);
    try {
      // GitHub Access Token 가져오기
      const token = await getSetting("github_access_token");

      if (!token) {
        setValidationResult({
          isValid: false,
          message: "GitHub Access Token이 설정되지 않았습니다. 먼저 토큰을 설정해주세요.",
        });
        setIsValidating(false);
        return;
      }

      const response = await fetch(`https://api.github.com/users/${username.trim()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "GitHub-PR-Finder",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setValidationResult({
          isValid: true,
          user: userData,
          message: `유효한 GitHub 사용자입니다: ${userData.name || userData.login}`,
        });
        // 실제 이름이 있으면 display_name에 자동 입력
        if (userData.name && !formData.display_name) {
          setFormData(prev => ({ ...prev, display_name: userData.name }));
        }
      } else if (response.status === 404) {
        setValidationResult({
          isValid: false,
          message: "존재하지 않는 GitHub 사용자입니다.",
        });
      } else {
        setValidationResult({
          isValid: false,
          message: "사용자 확인 중 오류가 발생했습니다.",
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: "사용자 확인 중 오류가 발생했습니다.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      alert("GitHub 사용자명을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      await addMember(formData.username.trim(), formData.display_name.trim() || undefined);
      setFormData({ username: "", display_name: "" });
      setValidationResult(null);
      await loadMembers();
    } catch (error) {
      console.error("멤버 추가 실패:", error);
      alert("멤버 추가에 실패했습니다. 이미 등록된 사용자일 수 있습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMember(id);
      await loadMembers();
    } catch (error) {
      console.error("멤버 삭제 실패:", error);
      alert("멤버 삭제에 실패했습니다.");
    }
  };

  const handleUsernameBlur = () => {
    if (formData.username.trim()) {
      validateGitHubUser(formData.username.trim());
    }
  };

  return (
    <div>
      <h3>Member 관리</h3>
      <p>Pull Request를 조회할 팀 멤버를 등록하고 관리합니다.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">GitHub 사용자명</label>
          <input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, username: e.target.value }));
              setValidationResult(null);
            }}
            onBlur={handleUsernameBlur}
            placeholder="예: octocat"
            required
          />
          {isValidating && (
            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
              GitHub 사용자 확인 중...
            </div>
          )}
        </div>

        {validationResult && (
          <div
            style={{
              padding: "12px",
              borderRadius: "4px",
              marginBottom: "16px",
              backgroundColor: validationResult.isValid ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${validationResult.isValid ? "#16a34a" : "#dc2626"}`,
              color: validationResult.isValid ? "#15803d" : "#dc2626",
              fontSize: "14px",
            }}
          >
            {validationResult.message}
            {validationResult.isValid && validationResult.user && (
              <div style={{ marginTop: "8px", fontSize: "12px" }}>
                <img
                  src={validationResult.user.avatar_url}
                  alt={validationResult.user.login}
                  style={{ width: "20px", height: "20px", borderRadius: "50%", marginRight: "8px", verticalAlign: "middle" }}
                />
                {validationResult.user.bio && (
                  <span style={{ color: "#6b7280" }}>Bio: {validationResult.user.bio}</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="display_name">표시 이름 (선택사항)</label>
          <input
            id="display_name"
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            placeholder="예: 홍길동"
          />
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            GitHub 사용자명 대신 표시할 이름입니다. 비워두면 GitHub 사용자명이 사용됩니다.
          </div>
        </div>

        <div className="button-group">
          <button
            type="submit"
            className="button-primary"
            disabled={isLoading || !validationResult?.isValid}
          >
            {isLoading ? "추가 중..." : "멤버 추가"}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              setFormData({ username: "", display_name: "" });
              setValidationResult(null);
            }}
          >
            초기화
          </button>
        </div>
      </form>

      <div style={{ marginTop: "32px" }}>
        <h4>등록된 멤버</h4>
        {members.length === 0 ? (
          <p style={{ color: "#6b7280", fontStyle: "italic" }}>
            등록된 멤버가 없습니다.
          </p>
        ) : (
          <div className="item-list">
            <div className="item-header">
              멤버 목록 ({members.length}명)
            </div>
            {members.map((member) => (
              <div key={member.id} className="item-row">
                <div className="item-info">
                  <div className="item-title">
                    {member.display_name || member.username}
                    {member.display_name && (
                      <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>
                        @{member.username}
                      </span>
                    )}
                  </div>
                  <div className="item-subtitle">
                    GitHub: {member.username}
                  </div>
                </div>
                <div className="item-actions">
                  <button
                    className="button-danger"
                    onClick={() => handleDelete(member.id!)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberSettings;