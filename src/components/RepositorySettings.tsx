import { useState, useEffect } from "react";
import { getRepositories, addRepository, deleteRepository, Repository } from "../utils/database";

const RepositorySettings = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    owner: "",
    url: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      const repos = await getRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error("저장소 목록 로드 실패:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.owner || !formData.url) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Adding repository:", formData);
      await addRepository(formData.name, formData.owner, formData.url);
      console.log("Repository added successfully");
      setFormData({ name: "", owner: "", url: "" });
      await loadRepositories();
      alert("저장소가 성공적으로 추가되었습니다.");
    } catch (error) {
      console.error("저장소 추가 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      alert(`저장소 추가에 실패했습니다: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRepository(id);
      await loadRepositories();
    } catch (error) {
      console.error("저장소 삭제 실패:", error);
      alert("저장소 삭제에 실패했습니다.");
    }
  };

  const generateGitHubUrl = () => {
    if (formData.owner && formData.name) {
      const url = `https://github.com/${formData.owner}/${formData.name}`;
      setFormData(prev => ({ ...prev, url }));
    }
  };

  return (
    <div>
      <h3>Repository 관리</h3>
      <p>GitHub PR을 조회할 저장소를 등록하고 관리합니다.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="owner">Owner</label>
          <input
            id="owner"
            type="text"
            value={formData.owner}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, owner: e.target.value }));
              setTimeout(generateGitHubUrl, 100);
            }}
            placeholder="예: facebook"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="name">Repository Name</label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name: e.target.value }));
              setTimeout(generateGitHubUrl, 100);
            }}
            placeholder="예: react"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="url">Repository URL</label>
          <input
            id="url"
            type="url"
            value={formData.url}
            onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://github.com/owner/repository"
            required
          />
        </div>

        <div className="button-group">
          <button
            type="submit"
            className="button-primary"
            disabled={isLoading}
          >
            {isLoading ? "추가 중..." : "저장소 추가"}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setFormData({ name: "", owner: "", url: "" })}
          >
            초기화
          </button>
        </div>
      </form>

      <div style={{ marginTop: "32px" }}>
        <h4>등록된 저장소</h4>
        {repositories.length === 0 ? (
          <p style={{ color: "#6b7280", fontStyle: "italic" }}>
            등록된 저장소가 없습니다.
          </p>
        ) : (
          <div className="item-list">
            <div className="item-header">
              저장소 목록 ({repositories.length}개)
            </div>
            {repositories.map((repo) => (
              <div key={repo.id} className="item-row">
                <div className="item-info">
                  <div className="item-title">
                    {repo.owner}/{repo.name}
                  </div>
                  <div className="item-subtitle">
                    {repo.url}
                  </div>
                </div>
                <div className="item-actions">
                  <button
                    className="button-danger"
                    onClick={() => handleDelete(repo.id!)}
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

export default RepositorySettings;