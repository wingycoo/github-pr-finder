// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_sql::{Migration, MigrationKind};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct PullRequest {
    number: u64,
    title: String,
    body: Option<String>,
    user: User,
    state: String,
    created_at: String,
    updated_at: String,
    merged_at: Option<String>,
    html_url: String,
    changed_files: Option<u64>,
    additions: Option<u64>,
    deletions: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
struct User {
    login: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn fetch_github_image(url: String, token: String) -> Result<Vec<u8>, String> {
    let client = reqwest::Client::new();

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "github-pr-finder")
        .send()
        .await
        .map_err(|e| format!("이미지 가져오기 실패: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("이미지 응답 오류: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("이미지 데이터 읽기 실패: {}", e))?
        .to_vec();

    Ok(bytes)
}

#[tauri::command]
async fn fetch_pr_diff(owner: String, repo: String, pr_number: u64, token: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://api.github.com/repos/{}/{}/pulls/{}",
        owner, repo, pr_number
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "github-pr-finder")
        .header("Accept", "application/vnd.github.v3.diff")
        .send()
        .await
        .map_err(|e| format!("Diff 가져오기 실패: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Diff 응답 오류: {}", response.status()));
    }

    let diff = response
        .text()
        .await
        .map_err(|e| format!("Diff 데이터 읽기 실패: {}", e))?;

    Ok(diff)
}

#[tauri::command]
async fn sync_pull_requests(
    owner: String,
    repo: String,
    token: String,
    start_date: String,
    end_date: String,
) -> Result<serde_json::Value, String> {
    // GitHub API 호출
    let client = reqwest::Client::new();
    let url = format!(
        "https://api.github.com/repos/{}/{}/pulls?state=all&per_page=100",
        owner, repo
    );
    println!("url: {}", url);

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "github-pr-finder")
        .send()
        .await
        .map_err(|e| format!("API 호출 실패: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API 응답 오류: {}", response.status()));
    }

    let prs: Vec<PullRequest> = response
        .json()
        .await
        .map_err(|e| format!("JSON 파싱 실패: {}", e))?;

    // 날짜 필터링 및 프론트엔드로 반환
    let filtered_prs: Vec<serde_json::Value> = prs
        .iter()
        .filter(|pr| pr.created_at >= start_date && pr.created_at <= end_date)
        .map(|pr| {
            serde_json::json!({
                "number": pr.number,
                "title": pr.title,
                "body": pr.body,
                "author": pr.user.login,
                "state": pr.state,
                "created_at": pr.created_at,
                "updated_at": pr.updated_at,
                "merged_at": pr.merged_at,
                "html_url": pr.html_url,
                "diff_url": format!("{}.diff", pr.html_url),
                "changed_files": pr.changed_files,
                "additions": pr.additions,
                "deletions": pr.deletions
            })
        })
        .collect();

    Ok(serde_json::json!({
        "prs": filtered_prs,
        "count": filtered_prs.len()
    }))
}


fn main() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS repositories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    owner TEXT NOT NULL,
                    url TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(owner, name)
                );

                CREATE TABLE IF NOT EXISTS members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    display_name TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS pull_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pr_number INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    body TEXT,
                    author TEXT NOT NULL,
                    repository_id INTEGER NOT NULL,
                    state TEXT NOT NULL,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    merged_at DATETIME,
                    html_url TEXT NOT NULL,
                    diff_url TEXT NOT NULL,
                    FOREIGN KEY (repository_id) REFERENCES repositories (id),
                    UNIQUE(repository_id, pr_number)
                );

                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT NOT NULL UNIQUE,
                    value TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_diff_content_to_pull_requests",
            sql: "ALTER TABLE pull_requests ADD COLUMN diff_content TEXT;",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:github_pr_finder.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, sync_pull_requests, fetch_github_image, fetch_pr_diff])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}