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
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">GitHub Access Token</h3>
        <p className="text-base-content/70">
          GitHub API를 사용하여 Pull Request 정보를 가져오기 위해 Personal Access
          Token이 필요합니다.
        </p>
      </div>

      <div className="alert alert-info">
        <div>
          <h4 className="font-semibold mb-2">토큰 생성 방법:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>
              GitHub → Settings → Developer settings → Personal access tokens →
              Tokens (classic)
            </li>
            <li>"Generate new token (classic)" 클릭</li>
            <li>
              필요한 권한: <code className="badge badge-sm">repo</code>, <code className="badge badge-sm">read:org</code>,{" "}
              <code className="badge badge-sm">read:user</code>
            </li>
            <li>생성된 토큰을 복사하여 아래에 입력</li>
          </ol>
        </div>
      </div>

      <div className="form-control w-full">
        <label className="label" htmlFor="token">
          <span className="label-text font-semibold">Personal Access Token</span>
        </label>
        <div className="flex gap-2">
          <input
            id="token"
            type={showToken ? "text" : "password"}
            className="input input-bordered flex-1"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setValidationResult(null);
            }}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? "숨김" : "표시"}
          </button>
        </div>
      </div>

      {validationResult && (
        <div className={`alert ${validationResult.isValid ? "alert-success" : "alert-error"}`}>
          <span>{validationResult.message}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={validateToken}
          disabled={isValidating || !token.trim()}
        >
          {isValidating ? "검증 중..." : "토큰 검증"}
        </button>
        {token && (
          <button type="button" className="btn btn-error" onClick={handleClear}>
            토큰 삭제
          </button>
        )}
      </div>

      <div className="bg-base-200 rounded-lg p-4 text-sm">
        <h4 className="font-semibold mb-2">보안 안내:</h4>
        <ul className="list-disc list-inside space-y-1 text-base-content/70">
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
