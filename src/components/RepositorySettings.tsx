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
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Repository 관리</h3>
        <p className="text-base-content/70">GitHub PR을 조회할 저장소를 등록하고 관리합니다.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control w-full">
          <label className="label" htmlFor="owner">
            <span className="label-text font-semibold">Owner</span>
          </label>
          <input
            id="owner"
            type="text"
            className="input input-bordered w-full"
            value={formData.owner}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, owner: e.target.value }));
              setTimeout(generateGitHubUrl, 100);
            }}
            placeholder="예: facebook"
            required
          />
        </div>

        <div className="form-control w-full">
          <label className="label" htmlFor="name">
            <span className="label-text font-semibold">Repository Name</span>
          </label>
          <input
            id="name"
            type="text"
            className="input input-bordered w-full"
            value={formData.name}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name: e.target.value }));
              setTimeout(generateGitHubUrl, 100);
            }}
            placeholder="예: react"
            required
          />
        </div>

        <div className="form-control w-full">
          <label className="label" htmlFor="url">
            <span className="label-text font-semibold">Repository URL</span>
          </label>
          <input
            id="url"
            type="url"
            className="input input-bordered w-full"
            value={formData.url}
            onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://github.com/owner/repository"
            required
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "추가 중..." : "저장소 추가"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setFormData({ name: "", owner: "", url: "" })}
          >
            초기화
          </button>
        </div>
      </form>

      <div className="mt-8">
        <h4 className="text-lg font-semibold mb-4">등록된 저장소</h4>
        {repositories.length === 0 ? (
          <p className="text-base-content/60 italic">
            등록된 저장소가 없습니다.
          </p>
        ) : (
          <div className="bg-base-200 rounded-lg overflow-hidden">
            <div className="bg-base-300 p-3 font-semibold">
              저장소 목록 ({repositories.length}개)
            </div>
            <div className="divide-y divide-base-300">
              {repositories.map((repo) => (
                <div key={repo.id} className="p-4 flex items-center justify-between hover:bg-base-300/50 transition-colors">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">
                      {repo.owner}/{repo.name}
                    </div>
                    <div className="text-sm text-base-content/70">
                      {repo.url}
                    </div>
                  </div>
                  <button
                    className="btn btn-error btn-sm"
                    onClick={() => handleDelete(repo.id!)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepositorySettings;