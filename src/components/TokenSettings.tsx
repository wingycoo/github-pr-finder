import { useEffect, useState } from "react";
import { DATA_KEY } from "../constants";
import { getSetting, setSetting } from "../utils/database";

const TokenSettings = () => {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    user?: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const savedToken = await getSetting(DATA_KEY.GITHUB_ACCESS_TOKEN);
      if (savedToken) {
        setToken(savedToken);
      }
    } catch (error) {
      console.error("토큰 로드 실패:", error);
    }
  };

  const handleSave = async () => {
    if (!token.trim()) {
      alert("GitHub Access Token을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      await setSetting("github_access_token", token.trim());
      alert("GitHub Access Token이 저장되었습니다.");
      setValidationResult(null);
    } catch (error) {
      console.error("토큰 저장 실패:", error);
      alert("토큰 저장에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const validateToken = async () => {
    if (!token.trim()) {
      alert("토큰을 입력해주세요.");
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "User-Agent": "GitHub-PR-Finder",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setValidationResult({
          isValid: true,
          user: userData.login,
          message: `인증 성공: ${userData.name || userData.login}`,
        });
      } else {
        setValidationResult({
          isValid: false,
          message: "유효하지 않은 토큰입니다.",
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: "토큰 검증 중 오류가 발생했습니다.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("저장된 토큰을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await setSetting("github_access_token", "");
      setToken("");
      setValidationResult(null);
      alert("토큰이 삭제되었습니다.");
    } catch (error) {
      console.error("토큰 삭제 실패:", error);
      alert("토큰 삭제에 실패했습니다.");
    }
  };

  return (
    <div>
      <h3>GitHub Access Token</h3>
      <p>
        GitHub API를 사용하여 Pull Request 정보를 가져오기 위해 Personal Access
        Token이 필요합니다.
      </p>

      <div
        style={{
          marginBottom: "16px",
          padding: "12px",
          backgroundColor: "#f0f9ff",
          border: "1px solid #0ea5e9",
          borderRadius: "4px",
        }}
      >
        <h4 style={{ margin: "0 0 8px 0", color: "#0c4a6e" }}>
          토큰 생성 방법:
        </h4>
        <ol style={{ margin: 0, paddingLeft: "20px", color: "#075985" }}>
          <li>
            GitHub → Settings → Developer settings → Personal access tokens →
            Tokens (classic)
          </li>
          <li>"Generate new token (classic)" 클릭</li>
          <li>
            필요한 권한: <code>repo</code>, <code>read:org</code>,{" "}
            <code>read:user</code>
          </li>
          <li>생성된 토큰을 복사하여 아래에 입력</li>
        </ol>
      </div>

      <div className="form-group">
        <label htmlFor="token">Personal Access Token</label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            id="token"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setValidationResult(null);
            }}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="button-secondary"
            onClick={() => setShowToken(!showToken)}
            style={{ padding: "8px 12px", minWidth: "60px" }}
          >
            {showToken ? "숨김" : "표시"}
          </button>
        </div>
      </div>

      {validationResult && (
        <div
          style={{
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "16px",
            backgroundColor: validationResult.isValid ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${
              validationResult.isValid ? "#16a34a" : "#dc2626"
            }`,
            color: validationResult.isValid ? "#15803d" : "#dc2626",
          }}
        >
          {validationResult.message}
        </div>
      )}

      <div className="button-group">
        <button
          type="button"
          className="button-primary"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={validateToken}
          disabled={isValidating || !token.trim()}
        >
          {isValidating ? "검증 중..." : "토큰 검증"}
        </button>
        {token && (
          <button type="button" className="button-danger" onClick={handleClear}>
            토큰 삭제
          </button>
        )}
      </div>

      <div style={{ marginTop: "24px", fontSize: "14px", color: "#6b7280" }}>
        <h4>보안 안내:</h4>
        <ul style={{ paddingLeft: "20px" }}>
          <li>토큰은 로컬 SQLite 데이터베이스에 저장됩니다.</li>
          <li>토큰은 GitHub API 호출시에만 사용됩니다.</li>
          <li>외부로 전송되지 않으며, 애플리케이션 내에서만 사용됩니다.</li>
          <li>필요시 언제든지 토큰을 삭제하거나 변경할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default TokenSettings;
