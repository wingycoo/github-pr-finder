# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

github Pull Request를 생성일자 월별로 조회할수 있는 Desktop Application
작성자 별로 Pull Request를 조회
Pull Request 본문은 Database(sqlite)에 저장하여 화면에서 markdown으로 보여주고 Code Diff는 WebView로 노출

## 기술 스택

- tauri
  - https://v2.tauri.app
- typescript
- React
- sqlite

## 화면 구성

### 데이터 동기화

- 선택한 기간의 Pull Request 동기화
  - 설정 > repository에서 추가한 repository에서 Pull Request 정보를 가져와서 Database에 저장

### Pull Request 조회

- a. 조회 대상 (member) 선택
  - 설정에서 추가한 member 목록을 노출하여 member 선택
- b. 월 선택
- c. Pull Request 목록 노출
  - 3개로 분할된 화면
    - Pull Request 목록
    - Pull Request 본문
    - Code Diff

### 설정

설정 화면 내에서 탭으로 아래 정보를 관리

- repository (multiple)
- github access token
- member 관리

## Development Setup

### 의존성 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run tauri:dev
```

### 프로덕션 빌드
```bash
npm run tauri:build
```

### 프론트엔드만 개발 서버 실행
```bash
npm run dev
```

### 프론트엔드 빌드
```bash
npm run build
```

## Architecture

### 프론트엔드 (React + TypeScript)
- **src/**: React 컴포넌트 및 TypeScript 코드
- **src/main.tsx**: 애플리케이션 진입점
- **src/App.tsx**: 메인 애플리케이션 컴포넌트

### 백엔드 (Tauri + Rust)
- **src-tauri/src/main.rs**: Tauri 애플리케이션 메인
- **src-tauri/Cargo.toml**: Rust 의존성 관리
- **src-tauri/tauri.conf.json**: Tauri 설정

### 데이터베이스 (SQLite)
데이터베이스 테이블:
- **repositories**: GitHub 저장소 정보
- **members**: 팀 멤버 정보
- **pull_requests**: PR 정보 (제목, 본문, 작성자, 상태 등)
- **settings**: 애플리케이션 설정

### 주요 기능
1. **데이터 동기화**: GitHub API를 통한 PR 정보 수집
2. **PR 조회**: 월별, 작성자별 PR 조회
3. **설정 관리**: 저장소, 토큰, 멤버 관리
