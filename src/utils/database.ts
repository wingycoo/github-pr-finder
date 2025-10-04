// @ts-ignore
import Database from "@tauri-apps/plugin-sql";

let db: any = null;

export async function getDatabase() {
  if (!db) {
    try {
      // Tauri v2 방식으로 데이터베이스 로드
      db = await Database.load("sqlite:github_pr_finder.db");
      console.log("Database loaded successfully");
    } catch (error) {
      console.error("Database loading failed:", error);
      throw error;
    }
  }
  return db;
}

export interface Repository {
  id?: number;
  name: string;
  owner: string;
  url: string;
}

export interface Member {
  id?: number;
  username: string;
  display_name?: string | null;
}

export interface Setting {
  key: string;
  value: string;
}

export async function getRepositories(): Promise<Repository[]> {
  try {
    const database = await getDatabase();
    const result = await database.select("SELECT id, name, owner, url FROM repositories ORDER BY name");
    console.log("Repositories loaded:", result);
    return result || [];
  } catch (error) {
    console.error("Failed to get repositories:", error);
    return [];
  }
}

export async function addRepository(name: string, owner: string, url: string): Promise<void> {
  try {
    const database = await getDatabase();
    console.log("Adding repository:", { name, owner, url });
    await database.execute("INSERT INTO repositories (name, owner, url) VALUES (?, ?, ?)", [name, owner, url]);
    console.log("Repository added successfully");
  } catch (error) {
    console.error("Failed to add repository:", error);
    throw error;
  }
}

export async function deleteRepository(id: number): Promise<void> {
  try {
    const database = await getDatabase();
    await database.execute("DELETE FROM repositories WHERE id = ?", [id]);
  } catch (error) {
    console.error("Failed to delete repository:", error);
    throw error;
  }
}

export async function getMembers(): Promise<Member[]> {
  try {
    const database = await getDatabase();
    const result = await database.select("SELECT id, username, display_name FROM members ORDER BY username");
    return result || [];
  } catch (error) {
    console.error("Failed to get members:", error);
    return [];
  }
}

export async function addMember(username: string, displayName?: string): Promise<void> {
  try {
    const database = await getDatabase();
    await database.execute("INSERT INTO members (username, display_name) VALUES (?, ?)", [username, displayName || null]);
  } catch (error) {
    console.error("Failed to add member:", error);
    throw error;
  }
}

export async function deleteMember(id: number): Promise<void> {
  try {
    const database = await getDatabase();
    await database.execute("DELETE FROM members WHERE id = ?", [id]);
  } catch (error) {
    console.error("Failed to delete member:", error);
    throw error;
  }
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    const database = await getDatabase();
    const result = await database.select("SELECT value FROM settings WHERE key = ?", [key]);
    if (result && result.length > 0 && result[0].value) {
      return result[0].value;
    }
    return null;
  } catch (error) {
    console.error("Failed to get setting:", error);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    const database = await getDatabase();
    await database.execute("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [key, value]);
  } catch (error) {
    console.error("Failed to set setting:", error);
    throw error;
  }
}